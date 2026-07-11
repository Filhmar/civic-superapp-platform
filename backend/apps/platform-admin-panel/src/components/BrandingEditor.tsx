import { useEffect, useMemo, useState } from 'react';
import { AdminApi, errorMessage } from '../lib/api';
import type { ConfigResponse, OnboardingSlide, TenantConfig } from '../lib/types';
import { useToast } from './Toast';
import AssetUpload from './AssetUpload';

interface BrandingForm {
  app: { name: string; tagline: string };
  colors: Record<string, string>;
  slogan: string;
  executive: { title: string; name: string; greeting: string; photo: string };
  logoAssets: Record<string, string>;
  onboarding: OnboardingSlide[];
  home: Record<string, boolean>;
}

const LOGO_ASSET_KEYS = ['seal', 'mascot', 'watermark'];

const COLOR_LABELS: Record<string, string> = {
  primary: 'Primary',
  primaryDark: 'Primary dark',
  accent: 'Accent',
  accentDeep: 'Accent deep',
  danger: 'Danger',
  tint: 'Tint',
};

function initForm(config: TenantConfig): BrandingForm {
  const slides: OnboardingSlide[] = [0, 1, 2].map((i) => ({
    title: config.onboarding?.[i]?.title ?? '',
    body: config.onboarding?.[i]?.body ?? '',
    bg: config.onboarding?.[i]?.bg ?? '#123456',
    image: config.onboarding?.[i]?.image ?? '',
  }));
  const assetKeys = Array.from(new Set([...LOGO_ASSET_KEYS, ...Object.keys(config.brand?.logo?.assets ?? {})]));
  const logoAssets: Record<string, string> = {};
  for (const k of assetKeys) logoAssets[k] = config.brand?.logo?.assets?.[k] ?? '';
  return {
    app: { name: config.app?.name ?? '', tagline: config.app?.tagline ?? '' },
    colors: { ...(config.brand?.colors ?? {}) },
    slogan: config.brand?.slogan ?? '',
    executive: {
      title: config.brand?.executive?.title ?? '',
      name: config.brand?.executive?.name ?? '',
      greeting: config.brand?.executive?.greeting ?? '',
      photo: config.brand?.executive?.photo ?? '',
    },
    logoAssets,
    onboarding: slides,
    home: { ...(config.home ?? {}) },
  };
}

/** Build a PATCH body containing ONLY the changed sections (server deep-merges). */
export function computeBrandingPatch(orig: BrandingForm, cur: BrandingForm): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};

  const app: Record<string, string> = {};
  if (cur.app.name !== orig.app.name) app.name = cur.app.name;
  if (cur.app.tagline !== orig.app.tagline) app.tagline = cur.app.tagline;
  if (Object.keys(app).length) patch.app = app;

  const brand: Record<string, unknown> = {};
  const colors: Record<string, string> = {};
  for (const k of Object.keys(cur.colors)) {
    if (cur.colors[k] !== orig.colors[k]) colors[k] = cur.colors[k];
  }
  if (Object.keys(colors).length) brand.colors = colors;
  if (cur.slogan !== orig.slogan) brand.slogan = cur.slogan;
  const executive: Record<string, string> = {};
  for (const k of ['title', 'name', 'greeting', 'photo'] as const) {
    if (cur.executive[k] !== orig.executive[k]) executive[k] = cur.executive[k];
  }
  if (Object.keys(executive).length) brand.executive = executive;
  const assets: Record<string, string> = {};
  for (const k of Object.keys(cur.logoAssets)) {
    if (cur.logoAssets[k] !== orig.logoAssets[k]) assets[k] = cur.logoAssets[k];
  }
  if (Object.keys(assets).length) brand.logo = { assets };
  if (Object.keys(brand).length) patch.brand = brand;

  if (JSON.stringify(cur.onboarding) !== JSON.stringify(orig.onboarding)) {
    patch.onboarding = cur.onboarding;
  }

  const home: Record<string, boolean> = {};
  for (const k of Object.keys(cur.home)) {
    if (cur.home[k] !== orig.home[k]) home[k] = cur.home[k];
  }
  if (Object.keys(home).length) patch.home = home;

  return Object.keys(patch).length ? patch : null;
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function ColorField({
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
    <div className="color-field">
      <span className="color-swatch-wrap">
        <span className="color-swatch" style={{ background: pickerValue }} />
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          aria-label={`${label} picker`}
        />
      </span>
      <span className="color-field-label">{label}</span>
      <input
        className="color-hex-input"
        value={value}
        maxLength={9}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} hex`}
      />
    </div>
  );
}

interface Props {
  tenantId: string;
  cfg: ConfigResponse;
  refetch: () => Promise<ConfigResponse>;
}

export default function BrandingEditor({ tenantId, cfg, refetch }: Props) {
  const toast = useToast();
  const [baseline, setBaseline] = useState<BrandingForm>(() => initForm(cfg.config));
  const [form, setForm] = useState<BrandingForm>(() => initForm(cfg.config));
  const [saving, setSaving] = useState(false);
  const [baseVersion, setBaseVersion] = useState(cfg.version);

  useEffect(() => {
    setBaseline(initForm(cfg.config));
    setForm(initForm(cfg.config));
    setBaseVersion(cfg.version);
    // Intentionally keyed on tenant so in-progress edits survive unrelated refetches.
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => computeBrandingPatch(baseline, form) !== null, [baseline, form]);

  const set = (fn: (f: BrandingForm) => BrandingForm) => setForm((f) => fn(structuredClone(f)));

  const submit = async () => {
    const patch = computeBrandingPatch(baseline, form);
    if (!patch) {
      toast.push('No changes to save', 'error');
      return;
    }
    setSaving(true);
    try {
      const { version } = await AdminApi.patchBranding(tenantId, patch);
      toast.push(`v${version} saved`);
      const fresh = await refetch();
      setBaseline(initForm(fresh.config));
      setForm(initForm(fresh.config));
      setBaseVersion(fresh.version);
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="stack">
        <section className="card">
          <span className="card-kicker">Palette</span>
          <div className="card-body palette-grid">
            {Object.keys(form.colors).map((key) => (
              <ColorField
                key={key}
                label={COLOR_LABELS[key] ?? key}
                value={form.colors[key]}
                onChange={(v) => set((f) => ({ ...f, colors: { ...f.colors, [key]: v } }))}
              />
            ))}
          </div>
        </section>

        <section className="card">
          <span className="card-kicker">Identity &amp; executive</span>
          <div className="card-body fields-col">
            <div className="form-grid-2">
              <label className="field">
                <span className="field-label">App name</span>
                <input
                  className="input"
                  value={form.app.name}
                  onChange={(e) => set((f) => ({ ...f, app: { ...f.app, name: e.target.value } }))}
                />
              </label>
              <label className="field">
                <span className="field-label">Tagline</span>
                <input
                  className="input"
                  value={form.app.tagline}
                  onChange={(e) => set((f) => ({ ...f, app: { ...f.app, tagline: e.target.value } }))}
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Slogan</span>
              <input
                className="input"
                value={form.slogan}
                onChange={(e) => set((f) => ({ ...f, slogan: e.target.value }))}
              />
            </label>
            <div className="form-grid-2">
              <label className="field">
                <span className="field-label">Executive title</span>
                <input
                  className="input"
                  value={form.executive.title}
                  onChange={(e) => set((f) => ({ ...f, executive: { ...f.executive, title: e.target.value } }))}
                />
              </label>
              <label className="field">
                <span className="field-label">Executive name</span>
                <input
                  className="input"
                  value={form.executive.name}
                  onChange={(e) => set((f) => ({ ...f, executive: { ...f.executive, name: e.target.value } }))}
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Greeting</span>
              <textarea
                className="input"
                value={form.executive.greeting}
                onChange={(e) => set((f) => ({ ...f, executive: { ...f.executive, greeting: e.target.value } }))}
              />
            </label>
            <AssetUpload
              tenantId={tenantId}
              label="Executive photo"
              value={form.executive.photo}
              onUploaded={(url) => set((f) => ({ ...f, executive: { ...f.executive, photo: url } }))}
            />
          </div>
        </section>

        <section className="card">
          <span className="card-kicker">Home screen flags</span>
          <div className="card-body check-row">
            {Object.keys(form.home).map((key) => (
              <label key={key} className="check-field">
                <span className="switch switch-sm">
                  <input
                    type="checkbox"
                    checked={form.home[key]}
                    onChange={(e) => set((f) => ({ ...f, home: { ...f.home, [key]: e.target.checked } }))}
                  />
                  <span className="slider" />
                </span>
                <span>{key.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="stack">
        <section className="card">
          <span className="card-kicker">Logo assets</span>
          <div className="card-body upload-grid">
            {Object.keys(form.logoAssets).map((key) => (
              <AssetUpload
                key={key}
                tenantId={tenantId}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                value={form.logoAssets[key]}
                onUploaded={(url) => set((f) => ({ ...f, logoAssets: { ...f.logoAssets, [key]: url } }))}
              />
            ))}
          </div>
        </section>

        <section className="card">
          <span className="card-kicker">Onboarding slides</span>
          <div className="card-body fields-col">
            {form.onboarding.map((slide, i) => (
              <div key={i} className="slide-row">
                <span className="slide-num">{i + 1}</span>
                <div className="slide-fields">
                  <input
                    className="input"
                    placeholder="Slide title"
                    value={slide.title}
                    onChange={(e) =>
                      set((f) => {
                        f.onboarding[i] = { ...f.onboarding[i], title: e.target.value };
                        return f;
                      })
                    }
                  />
                  <textarea
                    className="input"
                    placeholder="Slide body"
                    value={slide.body}
                    onChange={(e) =>
                      set((f) => {
                        f.onboarding[i] = { ...f.onboarding[i], body: e.target.value };
                        return f;
                      })
                    }
                  />
                  <ColorField
                    label="Background"
                    value={slide.bg}
                    onChange={(v) =>
                      set((f) => {
                        f.onboarding[i] = { ...f.onboarding[i], bg: v };
                        return f;
                      })
                    }
                  />
                  <AssetUpload
                    tenantId={tenantId}
                    label="Slide image"
                    value={slide.image}
                    onUploaded={(url) =>
                      set((f) => {
                        f.onboarding[i] = { ...f.onboarding[i], image: url };
                        return f;
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div>
          <button
            className="btn btn-primary btn-block"
            onClick={() => void submit()}
            disabled={saving || !dirty}
            data-testid="save-branding"
          >
            {saving ? 'Saving…' : 'Save branding — new config version'}
          </button>
          <div className="helper-text" style={{ textAlign: 'center', marginTop: 10 }}>
            Editing against v{baseVersion}
            {dirty ? ' — unsaved changes' : ' — no changes'}
          </div>
        </div>
      </div>
    </div>
  );
}
