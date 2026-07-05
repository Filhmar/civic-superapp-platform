import type { BrandColors, OnboardingSlide, TenantConfig } from '../lib/types';
import { AssetUpload } from './AssetUpload';

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

const COLOR_LABELS: { key: keyof BrandColors; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'primaryDark', label: 'Primary dark' },
  { key: 'accent', label: 'Accent' },
  { key: 'accentDeep', label: 'Accent deep' },
  { key: 'danger', label: 'Danger' },
  { key: 'tint', label: 'Tint' },
];

const LOGO_LABELS: { key: keyof BrandingForm['logoAssets']; label: string }[] = [
  { key: 'seal', label: 'City seal' },
  { key: 'mascot', label: 'Mascot' },
  { key: 'watermark', label: 'Watermark' },
];

const HOME_FLAGS: { key: keyof BrandingForm['home']; label: string }[] = [
  { key: 'mayors_corner', label: "Mayor's corner" },
  { key: 'digital_id_promo', label: 'Digital ID promo' },
];

interface BrandingEditorProps {
  form: BrandingForm;
  tenantId: string;
  saving: boolean;
  dirtyCount: number;
  onChange: (section: BrandingSection, next: BrandingForm) => void;
  onSubmit: () => void;
}

export function BrandingEditor({
  form,
  tenantId,
  saving,
  dirtyCount,
  onChange,
  onSubmit,
}: BrandingEditorProps) {
  const set = onChange;

  return (
    <form
      className="branding-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <section className="panel">
        <h2 className="panel-title">App identity</h2>
        <div className="field-grid">
          <label>
            <span className="field-label">App name</span>
            <input
              type="text"
              value={form.app.name}
              onChange={(e) => set('app', { ...form, app: { ...form.app, name: e.target.value } })}
            />
          </label>
          <label>
            <span className="field-label">Tagline</span>
            <input
              type="text"
              value={form.app.tagline}
              onChange={(e) =>
                set('app', { ...form, app: { ...form.app, tagline: e.target.value } })
              }
            />
          </label>
          <label>
            <span className="field-label">Slogan</span>
            <input
              type="text"
              data-testid="slogan-input"
              value={form.slogan}
              onChange={(e) => set('slogan', { ...form, slogan: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Brand colors</h2>
        <div className="swatch-row">
          {COLOR_LABELS.map(({ key }) => (
            <span
              key={key}
              className="swatch"
              title={key}
              style={{ background: HEX_RE.test(form.colors[key]) ? form.colors[key] : '#000' }}
            />
          ))}
        </div>
        <div className="field-grid colors-grid">
          {COLOR_LABELS.map(({ key, label }) => (
            <ColorField
              key={key}
              label={label}
              value={form.colors[key]}
              onChange={(v) =>
                set('colors', { ...form, colors: { ...form.colors, [key]: v } })
              }
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Logo assets</h2>
        <div className="field-grid logo-grid">
          {LOGO_LABELS.map(({ key, label }) => (
            <AssetUpload
              key={key}
              label={label}
              value={form.logoAssets[key]}
              tenantId={tenantId}
              onChange={(url) =>
                set('logo', { ...form, logoAssets: { ...form.logoAssets, [key]: url } })
              }
            />
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Chief executive</h2>
        <div className="field-grid">
          <label>
            <span className="field-label">Title</span>
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
            <span className="field-label">Name</span>
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
        </div>
        <label className="field-block">
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
        <AssetUpload
          label="Executive photo"
          value={form.executive.photo}
          tenantId={tenantId}
          onChange={(url) =>
            set('executive', { ...form, executive: { ...form.executive, photo: url } })
          }
        />
      </section>

      <section className="panel">
        <h2 className="panel-title">Onboarding slides</h2>
        <div className="slides-grid">
          {form.onboarding.map((slide, i) => (
            <div className="slide-card" key={i}>
              <div className="slide-card-head">Slide {i + 1}</div>
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
                    onboarding: form.onboarding.map((s, j) => (j === i ? { ...s, bg: v } : s)),
                  })
                }
              />
              <AssetUpload
                label="Image"
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
          ))}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Home screen</h2>
        <div className="checkbox-row">
          {HOME_FLAGS.map(({ key, label }) => (
            <label key={key} className="checkbox-label">
              <input
                type="checkbox"
                checked={form.home[key]}
                onChange={(e) =>
                  set('home', { ...form, home: { ...form.home, [key]: e.target.checked } })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <div className="form-actions">
        <span className="dirty-note">
          {dirtyCount > 0
            ? `${dirtyCount} section${dirtyCount === 1 ? '' : 's'} modified`
            : 'No changes yet'}
        </span>
        <button
          type="submit"
          className="btn btn-primary"
          data-testid="save-branding"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save branding'}
        </button>
      </div>
    </form>
  );
}

/** Fake phone header rendered live from the current form values. */
export function PhonePreview({ form }: { form: BrandingForm }) {
  const c = form.colors;
  return (
    <div className="phone-preview">
      <div className="phone-frame">
        <div className="phone-notch" />
        <div
          className="phone-band"
          style={{
            background: `linear-gradient(160deg, ${c.primary}, ${c.primaryDark})`,
          }}
        >
          <div className="phone-band-top">
            {form.logoAssets.seal ? (
              <img className="phone-seal" src={form.logoAssets.seal} alt="seal" />
            ) : (
              <span className="phone-seal phone-seal-empty" />
            )}
            <div>
              <div className="phone-app-name">{form.app.name || 'App name'}</div>
              <div className="phone-tagline">{form.app.tagline || 'Tagline'}</div>
            </div>
          </div>
          <span className="phone-slogan" style={{ background: c.accent, color: c.primaryDark }}>
            {form.slogan || 'Slogan'}
          </span>
        </div>
        <div className="phone-body" style={{ background: c.tint }}>
          <div className="phone-exec-card">
            {form.executive.photo ? (
              <img className="phone-exec-photo" src={form.executive.photo} alt="executive" />
            ) : (
              <span className="phone-exec-photo phone-exec-photo-empty" />
            )}
            <div className="phone-exec-text">
              <div className="phone-exec-title" style={{ color: c.accentDeep }}>
                {form.executive.title || 'Executive title'}
              </div>
              <div className="phone-exec-name">{form.executive.name || 'Executive name'}</div>
              <div className="phone-exec-greeting">
                {form.executive.greeting || 'Greeting message…'}
              </div>
            </div>
          </div>
          <div className="phone-onboarding-row">
            {form.onboarding.map((s, i) => (
              <div key={i} className="phone-slide" style={{ background: s.bg }}>
                <span>{s.title || `Slide ${i + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="preview-caption">Live preview — rendered from unsaved form values</div>
    </div>
  );
}
