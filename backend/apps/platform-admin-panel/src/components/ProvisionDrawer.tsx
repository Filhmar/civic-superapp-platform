import { useState } from 'react';
import { AdminApi, errorMessage } from '../lib/api';
import { MODULE_KEYS, MODULE_LABELS } from '../lib/types';
import { Icon } from './Icons';
import { useToast } from './Toast';

const STEPS = ['Identity', 'Configuration', 'Modules'] as const;

const KINDS = ['city', 'municipality', 'province', 'region'] as const;

const COLOR_FIELDS = [
  { key: 'primary', label: 'Primary' },
  { key: 'primaryDark', label: 'Primary dark' },
  { key: 'accent', label: 'Accent' },
  { key: 'accentDeep', label: 'Accent deep' },
  { key: 'danger', label: 'Danger' },
  { key: 'tint', label: 'Tint' },
] as const;

type ColorKey = (typeof COLOR_FIELDS)[number]['key'];

interface SlideDraft {
  title: string;
  body: string;
  bg: string;
}

interface DraftState {
  id: string;
  kind: string;
  bundleId: string;
  name: string;
  tagline: string;
  slogan: string;
  execTitle: string;
  execName: string;
  execGreeting: string;
  ticketPrefix: string;
  residentPrefix: string;
  lat: string;
  lng: string;
  barangays: string;
  colors: Record<ColorKey, string>;
  onboarding: SlideDraft[];
  modules: Record<string, boolean>;
}

/** Module defaults mirror the existing tenants: core modules on, add-ons off. */
const DEFAULT_MODULES: Record<string, boolean> = Object.fromEntries(
  MODULE_KEYS.map((k) => [k, !['health', 'jobs'].includes(k)]),
);

function initialDraft(): DraftState {
  return {
    id: '',
    kind: 'city',
    bundleId: '',
    name: '',
    tagline: '',
    slogan: '',
    execTitle: 'City Mayor',
    execName: '',
    execGreeting: '',
    ticketPrefix: '',
    residentPrefix: '',
    lat: '',
    lng: '',
    barangays: '',
    colors: {
      primary: '#1E8449',
      primaryDark: '#14603A',
      accent: '#F1C40F',
      accentDeep: '#B7950B',
      danger: '#E53935',
      tint: '#E8F0FB',
    },
    onboarding: [
      { title: 'All city services', body: 'From taxes to tourism — everything in one app.', bg: '#1E8449' },
      { title: 'Report & track', body: '311-style reporting with live status updates.', bg: '#14603A' },
      { title: 'Help in emergencies', body: 'Hold-to-SOS with live location, even offline.', bg: '#E53935' },
    ],
    modules: { ...DEFAULT_MODULES },
  };
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function validateStep1(d: DraftState): string | null {
  if (!/^[a-z0-9-]+$/.test(d.id)) return 'Tenant ID must be kebab-case (a–z, 0–9, dashes)';
  if (!/^[a-z0-9.]+$/.test(d.bundleId)) return 'Bundle ID must be lowercase dot notation (e.g. com.city.app)';
  if (!d.name.trim()) return 'Display name is required';
  if (!/^[A-Z]{2,5}$/.test(d.ticketPrefix)) return 'Ticket prefix must be 2–5 uppercase letters';
  if (!/^[A-Z]{2,5}$/.test(d.residentPrefix)) return 'Resident ID prefix must be 2–5 uppercase letters';
  if (!Number.isFinite(Number(d.lat)) || d.lat.trim() === '') return 'Centroid latitude must be a number';
  if (!Number.isFinite(Number(d.lng)) || d.lng.trim() === '') return 'Centroid longitude must be a number';
  if (d.barangays.split('\n').map((b) => b.trim()).filter(Boolean).length === 0)
    return 'List at least one barangay (one per line)';
  return null;
}

function validateStep2(d: DraftState): string | null {
  for (const { key, label } of COLOR_FIELDS) {
    if (!HEX_RE.test(d.colors[key])) return `${label} must be a #RRGGBB color`;
  }
  for (const [i, s] of d.onboarding.entries()) {
    if (!HEX_RE.test(s.bg)) return `Slide ${i + 1} background must be a #RRGGBB color`;
  }
  return null;
}

function ColorHexField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const pickerValue = HEX_RE.test(value) ? value : '#000000';
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="drawer-color-field">
        <span className="color-swatch-wrap">
          <span className="color-swatch" style={{ background: pickerValue }} />
          <input
            type="color"
            value={pickerValue}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            aria-label={`${label} picker`}
          />
        </span>
        <input
          className="color-hex-input"
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} hex`}
        />
      </div>
    </label>
  );
}

interface Props {
  onClose: () => void;
  onProvisioned: () => void;
}

export default function ProvisionDrawer({ onClose, onProvisioned }: Props) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const next = () => {
    const err = step === 0 ? validateStep1(draft) : step === 1 ? validateStep2(draft) : null;
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, 2));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const config = {
      tenant_id: draft.id,
      app: { name: draft.name.trim(), tagline: draft.tagline.trim() },
      brand: {
        colors: { ...draft.colors },
        logo: { type: 'image', assets: {} },
        slogan: draft.slogan.trim(),
        executive: {
          title: draft.execTitle.trim(),
          name: draft.execName.trim(),
          photo: '',
          greeting: draft.execGreeting.trim(),
        },
      },
      identifiers: {
        ticket_prefix: draft.ticketPrefix,
        resident_id_prefix: draft.residentPrefix,
      },
      geo: {
        centroid: [Number(draft.lat), Number(draft.lng)],
        units: draft.barangays
          .split('\n')
          .map((b) => b.trim())
          .filter(Boolean),
      },
      locales: ['en', 'fil'],
      onboarding: draft.onboarding.map((s) => ({
        title: s.title,
        body: s.body,
        bg: s.bg,
        image: '',
      })),
      home: { mayors_corner: true, digital_id_promo: true },
      modules: { ...draft.modules },
      integrations: { weather: 'openweather', sms: 'semaphore', payments: ['gcash', 'card'] },
    };
    try {
      await AdminApi.createTenant({
        id: draft.id,
        kind: draft.kind,
        bundle_id: draft.bundleId,
        name: draft.name.trim(),
        config,
      });
      toast.push('Tenant provisioned — v1 created');
      onProvisioned();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scrim scrim-right" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" role="dialog" aria-modal="true" data-testid="provision-drawer">
        <div className="drawer-head">
          <div>
            <span className="kicker">Onboarding</span>
            <div className="drawer-title">Provision new tenant</div>
          </div>
          <button
            className="icon-btn neutral"
            style={{ width: 36, height: 36 }}
            onClick={onClose}
            aria-label="Close"
            data-testid="drawer-close"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="drawer-stepper">
          {STEPS.map((label, i) => (
            <div key={label} className={`step${i <= step ? ' reached' : ''}`} data-testid={`drawer-step-${i + 1}`}>
              <div className="step-bar" />
              <div className="step-label">{label}</div>
            </div>
          ))}
        </div>
        <div className="drawer-body">
          <div className="fields-col" data-testid={`drawer-pane-${step + 1}`}>
            {step === 0 && (
              <>
                <label className="field">
                  <span className="field-label">Tenant ID</span>
                  <input
                    className="input mono-input"
                    placeholder="ph-province-city"
                    value={draft.id}
                    onChange={(e) => set('id', e.target.value)}
                    data-testid="prov-tenant-id"
                  />
                </label>
                <div className="form-grid-2">
                  <label className="field">
                    <span className="field-label">Kind</span>
                    <select className="input" value={draft.kind} onChange={(e) => set('kind', e.target.value)}>
                      {KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Bundle ID</span>
                    <input
                      className="input mono-input"
                      placeholder="com.city.app"
                      value={draft.bundleId}
                      onChange={(e) => set('bundleId', e.target.value)}
                      data-testid="prov-bundle-id"
                    />
                  </label>
                </div>
                <div className="form-grid-2">
                  <label className="field">
                    <span className="field-label">Display name</span>
                    <input
                      className="input"
                      placeholder="MyCity"
                      value={draft.name}
                      onChange={(e) => set('name', e.target.value)}
                      data-testid="prov-name"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Tagline</span>
                    <input
                      className="input"
                      placeholder="The city in your pocket"
                      value={draft.tagline}
                      onChange={(e) => set('tagline', e.target.value)}
                    />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Slogan</span>
                  <input
                    className="input"
                    placeholder="City slogan…"
                    value={draft.slogan}
                    onChange={(e) => set('slogan', e.target.value)}
                  />
                </label>
                <div className="form-grid-2">
                  <label className="field">
                    <span className="field-label">Executive title</span>
                    <input
                      className="input"
                      value={draft.execTitle}
                      onChange={(e) => set('execTitle', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Executive name</span>
                    <input
                      className="input"
                      placeholder="Hon. Full Name"
                      value={draft.execName}
                      onChange={(e) => set('execName', e.target.value)}
                    />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Executive greeting</span>
                  <textarea
                    className="input"
                    placeholder="Welcome message shown in the resident app…"
                    value={draft.execGreeting}
                    onChange={(e) => set('execGreeting', e.target.value)}
                  />
                </label>
                <div className="form-grid-2">
                  <label className="field">
                    <span className="field-label">Ticket prefix</span>
                    <input
                      className="input mono-input"
                      placeholder="XXX"
                      maxLength={5}
                      value={draft.ticketPrefix}
                      onChange={(e) => set('ticketPrefix', e.target.value.toUpperCase())}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Resident ID prefix</span>
                    <input
                      className="input mono-input"
                      placeholder="XXX"
                      maxLength={5}
                      value={draft.residentPrefix}
                      onChange={(e) => set('residentPrefix', e.target.value.toUpperCase())}
                    />
                  </label>
                </div>
                <div className="form-grid-2">
                  <label className="field">
                    <span className="field-label">Centroid latitude</span>
                    <input
                      className="input mono-input"
                      placeholder="12.9714"
                      value={draft.lat}
                      onChange={(e) => set('lat', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Centroid longitude</span>
                    <input
                      className="input mono-input"
                      placeholder="124.0064"
                      value={draft.lng}
                      onChange={(e) => set('lng', e.target.value)}
                    />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Barangays (one per line)</span>
                  <textarea
                    className="input"
                    style={{ height: 96 }}
                    placeholder={'Barangay 1\nBarangay 2'}
                    value={draft.barangays}
                    onChange={(e) => set('barangays', e.target.value)}
                    data-testid="prov-barangays"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Locales</span>
                  <input className="input mono-input" value="en, fil" disabled />
                </label>
              </>
            )}
            {step === 1 && (
              <>
                <span className="card-kicker">Brand colors</span>
                <div className="form-grid-2">
                  {COLOR_FIELDS.map(({ key, label }) => (
                    <ColorHexField
                      key={key}
                      label={label}
                      value={draft.colors[key]}
                      onChange={(v) => set('colors', { ...draft.colors, [key]: v })}
                    />
                  ))}
                </div>
                <span className="card-kicker" style={{ marginTop: 8 }}>
                  Onboarding slides
                </span>
                {draft.onboarding.map((slide, i) => (
                  <div key={i} className="slide-row">
                    <span className="slide-num">{i + 1}</span>
                    <div className="slide-fields">
                      <input
                        className="input"
                        placeholder="Slide title"
                        value={slide.title}
                        onChange={(e) => {
                          const next = [...draft.onboarding];
                          next[i] = { ...slide, title: e.target.value };
                          set('onboarding', next);
                        }}
                      />
                      <textarea
                        className="input"
                        placeholder="Slide body"
                        value={slide.body}
                        onChange={(e) => {
                          const next = [...draft.onboarding];
                          next[i] = { ...slide, body: e.target.value };
                          set('onboarding', next);
                        }}
                      />
                      <div className="drawer-color-field">
                        <span className="color-swatch-wrap">
                          <span
                            className="color-swatch"
                            style={{ background: HEX_RE.test(slide.bg) ? slide.bg : '#000' }}
                          />
                          <input
                            type="color"
                            value={HEX_RE.test(slide.bg) ? slide.bg : '#000000'}
                            onChange={(e) => {
                              const next = [...draft.onboarding];
                              next[i] = { ...slide, bg: e.target.value.toUpperCase() };
                              set('onboarding', next);
                            }}
                            aria-label={`Slide ${i + 1} background picker`}
                          />
                        </span>
                        <input
                          className="color-hex-input"
                          value={slide.bg}
                          maxLength={7}
                          onChange={(e) => {
                            const next = [...draft.onboarding];
                            next[i] = { ...slide, bg: e.target.value };
                            set('onboarding', next);
                          }}
                          aria-label={`Slide ${i + 1} background hex`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            {step === 2 && (
              <>
                <span className="helper-text">
                  Enable the modules included in this tenant’s billing tier.
                </span>
                {MODULE_KEYS.map((key) => (
                  <div key={key} className="drawer-module-row">
                    <span className="drawer-module-label">{MODULE_LABELS[key] ?? key}</span>
                    <label className="switch switch-md" data-module={`prov-${key}`}>
                      <input
                        type="checkbox"
                        checked={draft.modules[key]}
                        onChange={() =>
                          set('modules', { ...draft.modules, [key]: !draft.modules[key] })
                        }
                      />
                      <span className="slider" />
                    </label>
                  </div>
                ))}
              </>
            )}
            {error && (
              <div className="form-error" data-testid="drawer-error">
                <Icon name="alert" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
        <div className="drawer-foot">
          <button className="btn btn-secondary" onClick={step === 0 ? onClose : back} disabled={busy} data-testid="drawer-back">
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 2 ? (
            <button className="btn btn-primary btn-drawer-primary" onClick={next} data-testid="drawer-continue">
              Continue
            </button>
          ) : (
            <button
              className="btn btn-primary btn-drawer-primary"
              onClick={() => void submit()}
              disabled={busy}
              data-testid="drawer-provision"
            >
              {busy ? 'Provisioning…' : 'Provision tenant'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
