import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useSession } from '../components/AuthLayout';
import { useToast } from '../components/Toasts';
import { Icon } from '../components/Icons';
import { fmtVersion } from '../components/CatChip';
import { applyTenantTheme } from '../lib/theme';
import {
  BrandingEditor,
  PhonePreview,
  buildBrandingPatch,
  configToForm,
} from '../components/BrandingEditor';
import type { BrandingForm, BrandingSection } from '../components/BrandingEditor';
import type { ConfigHistoryEntry, ConfigResponse } from '../lib/types';

export function Branding() {
  const { tenant } = useSession();
  const toast = useToast();
  const [version, setVersion] = useState<number | null>(null);
  const [form, setForm] = useState<BrandingForm | null>(null);
  const [dirty, setDirty] = useState<Set<BrandingSection>>(new Set());
  const [history, setHistory] = useState<ConfigHistoryEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (resetForm: boolean) => {
      const base = `/admin/tenants/${tenant.id}`;
      const [cfg, hist] = await Promise.all([
        api<ConfigResponse>(`${base}/config`),
        api<ConfigHistoryEntry[]>(`${base}/config/history`),
      ]);
      setVersion(cfg.version);
      setHistory(hist.slice(0, 6));
      if (resetForm) {
        setForm(configToForm(cfg.config));
        setDirty(new Set());
      }
    },
    [tenant.id],
  );

  useEffect(() => {
    void load(true).catch((err: unknown) => {
      toast('error', err instanceof ApiError ? err.message : 'Failed to load configuration');
    });
  }, [load, toast]);

  function handleChange(section: BrandingSection, next: BrandingForm) {
    setForm(next);
    setDirty((cur) => {
      if (cur.has(section)) return cur;
      const copy = new Set(cur);
      copy.add(section);
      return copy;
    });
  }

  async function handleSubmit() {
    if (!form) return;
    const branding = buildBrandingPatch(form, dirty);
    if (!branding) {
      toast('info', 'Nothing to save — no sections were modified');
      return;
    }
    const colorsChanged = dirty.has('colors');
    setSaving(true);
    try {
      const result = await api<{ version: number }>(
        `/admin/tenants/${tenant.id}/config/branding`,
        { method: 'PATCH', body: { branding } },
      );
      toast('success', `Saved v${result.version}`);
      setDirty(new Set());
      // The saved config version re-themes the whole console on config refresh.
      if (colorsChanged) applyTenantTheme(form.colors);
      await load(false);
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <div className="loading">Loading branding…</div>;

  return (
    <div className="page page-branding">
      <div className="page-head">
        <div>
          <div className="page-kicker">Flagship</div>
          <h2 className="page-title">Branding Studio</h2>
        </div>
        <div className="head-actions">
          <span className="dirty-note">
            {dirty.size > 0
              ? `${dirty.size} section${dirty.size === 1 ? '' : 's'} modified`
              : 'No changes yet'}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            data-testid="save-branding"
            disabled={saving}
            onClick={() => void handleSubmit()}
          >
            <Icon name="save" />
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
      <div className="branding-layout">
        <BrandingEditor form={form} tenantId={tenant.id} onChange={handleChange} />
        <div className="branding-side">
          <div>
            <div className="preview-live">
              <span className="live-dot" aria-hidden />
              <span>Live preview</span>
            </div>
            <PhonePreview form={form} />
          </div>
          <section className="panel history-panel">
            <div className="panel-title" style={{ marginBottom: 8 }}>
              Version history
            </div>
            <ul className="history-list">
              {history.map((h) => {
                const current = h.version === version;
                return (
                  <li key={h.version} data-testid={current ? 'config-version' : undefined}>
                    <span className={`history-dot${current ? ' current' : ''}`} aria-hidden />
                    <span className={`history-label${current ? ' current' : ''}`}>
                      v{h.version}
                      {current ? ' · current' : ''}
                    </span>
                    <span className="history-date">{fmtVersion(h.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
