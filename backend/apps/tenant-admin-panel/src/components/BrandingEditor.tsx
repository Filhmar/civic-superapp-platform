import { useRef, useState } from 'react';
import type { BrandColors, OnboardingSlide, TenantConfig } from '../lib/types';
import { ApiError, uploadAsset, UPLOAD_CONTENT_TYPES } from '../lib/api';
import { darken, hexA } from '../lib/theme';
import { AssetUpload } from './AssetUpload';
import { Icon } from './Icons';
import { useToast } from './Toasts';

export type BrandingSection =
  | 'app'
  | 'colors'
  | 'slogan'
  | 'executive'
  | 'logo'
  | 'onboarding'
  | 'home';

export interface BrandingForm {
  app: { name: string; tagline: string };
  colors: BrandColors;
  slogan: string;
  executive: { title: string; name: string; photo: string; greeting: string };
  logoAssets: { seal: string; mascot: string; watermark: string };
  onboarding: OnboardingSlide[];
  home: { mayors_corner: boolean; digital_id_promo: boolean };
}

const EMPTY_SLIDE: OnboardingSlide = { title: '', body: '', bg: '#000000', image: '' };

export function configToForm(config: TenantConfig): BrandingForm {
  const slides = config.onboarding ?? [];
  return {
    app: { name: config.app?.name ?? '', tagline: config.app?.tagline ?? '' },
    colors: {
      primary: config.brand?.colors?.primary ?? '#000000',
      primaryDark: config.brand?.colors?.primaryDark ?? '#000000',
      accent: config.brand?.colors?.accent ?? '#000000',
      accentDeep: config.brand?.colors?.accentDeep ?? '#000000',
      danger: config.brand?.colors?.danger ?? '#000000',
      tint: config.brand?.colors?.tint ?? '#ffffff',
    },
    slogan: config.brand?.slogan ?? '',
    executive: {
      title: config.brand?.executive?.title ?? '',
      name: config.brand?.executive?.name ?? '',
      photo: config.brand?.executive?.photo ?? '',
      greeting: config.brand?.executive?.greeting ?? '',
    },
    logoAssets: {
      seal: config.brand?.logo?.assets?.seal ?? '',
      mascot: config.brand?.logo?.assets?.mascot ?? '',
      watermark: config.brand?.logo?.assets?.watermark ?? '',
    },
    onboarding: [0, 1, 2].map((i) => ({ ...EMPTY_SLIDE, ...slides[i] })),
    home: {
      mayors_corner: config.home?.mayors_corner ?? false,
      digital_id_promo: config.home?.digital_id_promo ?? false,
    },
  };
}

/** Assemble the PATCH branding payload from ONLY the sections the user touched. */
export function buildBrandingPatch(
  form: BrandingForm,
  dirty: ReadonlySet<BrandingSection>,
): Record<string, unknown> | null {
  const branding: Record<string, unknown> = {};
  if (dirty.has('app')) branding.app = form.app;
  const brand: Record<string, unknown> = {};
  if (dirty.has('colors')) brand.colors = form.colors;
  if (dirty.has('slogan')) brand.slogan = form.slogan;
  if (dirty.has('executive')) brand.executive = form.executive;
  if (dirty.has('logo')) brand.logo = { assets: form.logoAssets };
  if (Object.keys(brand).length > 0) branding.brand = brand;
  if (dirty.has('onboarding')) branding.onboarding = form.onboarding;
  if (dirty.has('home')) branding.home = form.home;
  return Object.keys(branding).length > 0 ? branding : null;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** Quick-pick preset palettes = the three seeded tenants' brand colors. */
const PRIMARY_PRESETS: { primary: string; primaryDark: string }[] = [
  { primary: '#0E5C74', primaryDark: '#083A4C' }, // MyLegazpi teal
  { primary: '#1B4F9C', primaryDark: '#123A75' }, // MySorsogon blue
  { primary: '#1E8449', primaryDark: '#14532D' }, // MyDasma green
];

const ACCENT_PRESETS: { accent: string; accentDeep: string }[] = [
  { accent: '#F26B21', accentDeep: '#C94F10' }, // Lava orange
  { accent: '#D62839', accentDeep: '#A31D2B' }, // Sorsogon red
  { accent: '#F1C40F', accentDeep: '#D4A017' }, // Dasma yellow
];

function SwatchRow({
  swatches,
  selected,
  onPick,
}: {
  swatches: string[];
  selected: string;
  onPick: (hex: string) => void;
}) {
  return (
    <div className="swatch-row">
      {swatches.map((hex) => {
        const isSel = selected.toLowerCase() === hex.toLowerCase();
        return (
          <button
            key={hex}
            type="button"
            className="swatch"
            title={hex}
            aria-pressed={isSel}
            style={{
              background: hex,
              borderColor: isSel ? darken(hex, 0.25) : 'transparent',
            }}
            onClick={() => onPick(hex)}
          >
            {isSel && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = HEX_RE.test(value);
  return (
    <label className="color-field">
      <span className="field-label">{label}</span>
      <span className="color-field-inputs">
        <input
          type="color"
          value={valid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} picker`}
        />
        <input
          type="text"
          className={`hex-input${valid ? '' : ' invalid'}`}
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
    </label>
  );
}

/** 52px dashed executive-photo stub with a real presign→PUT→confirm upload. */
function ExecPhotoStub({
  value,
  tenantId,
  onChange,
}: {
  value: string;
  tenantId: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadAsset(file, tenantId));
      toast('success', 'Executive photo uploaded');
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <button
        type="button"
        className="exec-photo-stub"
        title="Upload executive photo"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {value ? <img src={value} alt="Executive" /> : <Icon name="camera" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_CONTENT_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </>
  );
}

interface BrandingEditorProps {
  form: BrandingForm;
  tenantId: string;
  onChange: (section: BrandingSection, next: BrandingForm) => void;
}

export function BrandingEditor({ form, tenantId, onChange }: BrandingEditorProps) {
  const set = onChange;
  const [openSlide, setOpenSlide] = useState<number | null>(null);

  function setColors(patch: Partial<BrandColors>) {
    set('colors', { ...form, colors: { ...form.colors, ...patch } });
  }

  return (
    <div className="branding-form">
      {/* ---- colors ---- */}
      <section className="panel">
        <div className="color-group">
          <div className="panel-title" style={{ marginBottom: 0 }}>
            Primary color
          </div>
          <SwatchRow
            swatches={PRIMARY_PRESETS.map((p) => p.primary)}
            selected={form.colors.primary}
            onPick={(hex) => {
              const preset = PRIMARY_PRESETS.find((p) => p.primary === hex);
              setColors(preset ?? { primary: hex });
            }}
          />
          <div className="color-free-row">
            <ColorField
              label="Primary"
              value={form.colors.primary}
              onChange={(v) => setColors({ primary: v })}
            />
            <ColorField
              label="Primary dark"
              value={form.colors.primaryDark}
              onChange={(v) => setColors({ primaryDark: v })}
            />
          </div>
        </div>
        <div className="color-group">
          <div className="panel-title" style={{ marginBottom: 0 }}>
            Accent color
          </div>
          <SwatchRow
            swatches={ACCENT_PRESETS.map((p) => p.accent)}
            selected={form.colors.accent}
            onPick={(hex) => {
              const preset = ACCENT_PRESETS.find((p) => p.accent === hex);
              setColors(preset ?? { accent: hex });
            }}
          />
          <div className="color-free-row">
            <ColorField
              label="Accent"
              value={form.colors.accent}
              onChange={(v) => setColors({ accent: v })}
            />
            <ColorField
              label="Accent deep"
              value={form.colors.accentDeep}
              onChange={(v) => setColors({ accentDeep: v })}
            />
          </div>
        </div>
        <div className="color-minor-grid">
          <ColorField
            label="Danger"
            value={form.colors.danger}
            onChange={(v) => setColors({ danger: v })}
          />
          <ColorField
            label="Tint"
            value={form.colors.tint}
            onChange={(v) => setColors({ tint: v })}
          />
        </div>
      </section>

      {/* ---- identity ---- */}
      <section className="panel">
        <div className="panel-title">Identity</div>
        <label className="field-block">
          <span className="field-label">App name</span>
          <input
            type="text"
            value={form.app.name}
            onChange={(e) => set('app', { ...form, app: { ...form.app, name: e.target.value } })}
          />
        </label>
        <label className="field-block">
          <span className="field-label">Tagline</span>
          <input
            type="text"
            value={form.app.tagline}
            onChange={(e) =>
              set('app', { ...form, app: { ...form.app, tagline: e.target.value } })
            }
          />
        </label>
        <label className="field-block">
          <span className="field-label">Slogan</span>
          <input
            type="text"
            data-testid="slogan-input"
            value={form.slogan}
            onChange={(e) => set('slogan', { ...form, slogan: e.target.value })}
          />
        </label>
        <div className="exec-row field-block">
          <label style={{ flex: '0 0 32%' }}>
            <span className="field-label">Executive title</span>
            <input
              type="text"
              value={form.executive.title}
              onChange={(e) =>
                set('executive', {
                  ...form,
                  executive: { ...form.executive, title: e.target.value },
                })
              }
            />
          </label>
          <label>
            <span className="field-label">Executive (Mayor)</span>
            <input
              type="text"
              value={form.executive.name}
              onChange={(e) =>
                set('executive', {
                  ...form,
                  executive: { ...form.executive, name: e.target.value },
                })
              }
            />
          </label>
          <ExecPhotoStub
            value={form.executive.photo}
            tenantId={tenantId}
            onChange={(url) =>
              set('executive', { ...form, executive: { ...form.executive, photo: url } })
            }
          />
        </div>
        <label>
          <span className="field-label">Greeting</span>
          <textarea
            rows={3}
            value={form.executive.greeting}
            onChange={(e) =>
              set('executive', {
                ...form,
                executive: { ...form.executive, greeting: e.target.value },
              })
            }
          />
        </label>
      </section>

      {/* ---- logo assets + onboarding ---- */}
      <div className="branding-assets-row">
        <section className="panel">
          <div className="panel-title">Logo assets</div>
          <div className="upload-list">
            <AssetUpload
              label="City seal"
              hint="SVG / PNG · square"
              value={form.logoAssets.seal}
              tenantId={tenantId}
              onChange={(url) =>
                set('logo', { ...form, logoAssets: { ...form.logoAssets, seal: url } })
              }
            />
            <AssetUpload
              label="Mascot"
              hint="SVG / PNG"
              value={form.logoAssets.mascot}
              tenantId={tenantId}
              onChange={(url) =>
                set('logo', { ...form, logoAssets: { ...form.logoAssets, mascot: url } })
              }
            />
            <AssetUpload
              label="Watermark"
              hint="PNG · transparent"
              value={form.logoAssets.watermark}
              tenantId={tenantId}
              onChange={(url) =>
                set('logo', { ...form, logoAssets: { ...form.logoAssets, watermark: url } })
              }
            />
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">Onboarding slides</div>
          <div className="onboarding-list">
            {form.onboarding.map((slide, i) => (
              <div key={i}>
                <button
                  type="button"
                  className="onboarding-row"
                  onClick={() => setOpenSlide((cur) => (cur === i ? null : i))}
                  aria-expanded={openSlide === i}
                >
                  <span className="onboarding-num">{i + 1}</span>
                  <span className="onboarding-title">{slide.title || `Slide ${i + 1}`}</span>
                  <Icon name="pencil" />
                </button>
                {openSlide === i && (
                  <div className="onboarding-editor" style={{ marginTop: 8 }}>
                    <label>
                      <span className="field-label">Title</span>
                      <input
                        type="text"
                        value={slide.title}
                        onChange={(e) =>
                          set('onboarding', {
                            ...form,
                            onboarding: form.onboarding.map((s, j) =>
                              j === i ? { ...s, title: e.target.value } : s,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span className="field-label">Body</span>
                      <textarea
                        rows={3}
                        value={slide.body}
                        onChange={(e) =>
                          set('onboarding', {
                            ...form,
                            onboarding: form.onboarding.map((s, j) =>
                              j === i ? { ...s, body: e.target.value } : s,
                            ),
                          })
                        }
                      />
                    </label>
                    <ColorField
                      label="Background"
                      value={slide.bg}
                      onChange={(v) =>
                        set('onboarding', {
                          ...form,
                          onboarding: form.onboarding.map((s, j) =>
                            j === i ? { ...s, bg: v } : s,
                          ),
                        })
                      }
                    />
                    <AssetUpload
                      label="Image"
                      hint="Slide illustration"
                      value={slide.image}
                      tenantId={tenantId}
                      onChange={(url) =>
                        set('onboarding', {
                          ...form,
                          onboarding: form.onboarding.map((s, j) =>
                            j === i ? { ...s, image: url } : s,
                          ),
                        })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ---- home screen flags ---- */}
      <section className="panel">
        <div className="panel-title">Home screen</div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {(
            [
              { key: 'mayors_corner', label: "Mayor's corner" },
              { key: 'digital_id_promo', label: 'Digital ID promo' },
            ] as const
          ).map(({ key, label }) => (
            <div
              key={key}
              className="toggle-row"
              onClick={() =>
                set('home', { ...form, home: { ...form.home, [key]: !form.home[key] } })
              }
            >
              <button
                type="button"
                role="switch"
                aria-checked={form.home[key]}
                aria-label={label}
                className="toggle"
              />
              {label}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const PV_TILES: { label: string; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { label: 'e-Gov', icon: 'bank' },
  { label: 'Report', icon: 'alert-triangle' },
  { label: 'Assist', icon: 'heart' },
  { label: 'Hotlines', icon: 'phone' },
  { label: 'News', icon: 'news' },
  { label: 'Tourism', icon: 'map-pin' },
  { label: 'Transport', icon: 'bus' },
  { label: 'Health', icon: 'operations' },
];

/**
 * 312×520 sticky phone preview — themes LIVE from the DRAFT form values
 * (pvPrimary/pvAccent), while the console shell stays on the saved config.
 */
export function PhonePreview({ form }: { form: BrandingForm }) {
  const pvPrimary = HEX_RE.test(form.colors.primary) ? form.colors.primary : '#000000';
  const pvAccent = HEX_RE.test(form.colors.accent) ? form.colors.accent : '#888888';
  const pvDark = darken(pvPrimary, 0.4);

  const tileTheme = (i: number): { background: string; color: string } => {
    switch (i % 3) {
      case 0:
        return { background: hexA(pvPrimary, 0.1), color: pvPrimary };
      case 1:
        return { background: hexA(pvAccent, 0.12), color: pvAccent };
      default:
        return { background: '#EEF1F4', color: '#6B7C70' };
    }
  };

  return (
    <div className="phone-card" style={{ boxShadow: `0 20px 50px var(--primary-a18)` }}>
      <div className="phone-screen">
        <div className="pv-hero" style={{ background: `linear-gradient(135deg, ${pvDark}, ${pvPrimary})` }}>
          <div className="pv-hero-top">
            <span className="pv-logo">
              {form.logoAssets.seal ? (
                <img src={form.logoAssets.seal} alt="" />
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M12 4 L20 20 L4 20 Z" fill="#fff" />
                </svg>
              )}
            </span>
            <span className="pv-greet">
              <div className="pv-greet-sub">Magandang umaga 👋</div>
              <div className="pv-greet-name">Juan Dela Cruz</div>
            </span>
            <span className="pv-avatar" style={{ background: pvAccent }}>
              JD
            </span>
          </div>
          <div className="pv-search">
            <Icon name="search" />
            Maghanap ng serbisyo…
          </div>
        </div>
        <div className="pv-body">
          <div className="pv-sos">
            <span className="pv-sos-icon">
              <Icon name="alert-triangle" />
            </span>
            <span>
              <div className="pv-sos-title">Emergency SOS</div>
              <div className="pv-sos-sub">City Rescue · 911</div>
            </span>
          </div>
          <div className="pv-section">Mga Serbisyo</div>
          <div className="pv-tiles">
            {PV_TILES.map((t, i) => (
              <span className="pv-tile" key={t.label}>
                <span className="pv-tile-icon" style={tileTheme(i)}>
                  <Icon name={t.icon} />
                </span>
                <span className="pv-tile-label">{t.label}</span>
              </span>
            ))}
          </div>
          <div
            className="pv-mayor"
            style={{ background: `linear-gradient(120deg, ${pvDark}, ${pvPrimary})` }}
          >
            <span className="pv-mayor-avatar">
              {form.executive.photo && <img src={form.executive.photo} alt="" />}
            </span>
            <span>
              <div className="pv-mayor-kicker" style={{ color: pvAccent }}>
                Mayor&apos;s Corner
              </div>
              <div className="pv-mayor-slogan">{form.slogan || 'City slogan'}</div>
              <div className="pv-mayor-exec">{form.executive.name || 'Executive name'}</div>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
