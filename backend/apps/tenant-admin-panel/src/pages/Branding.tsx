import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useSession } from '../components/AuthLayout';
import { useToast } from '../components/Toasts';
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
    setSaving(true);
    try {
      const result = await api<{ version: number }>(
        `/admin/tenants/${tenant.id}/config/branding`,
        { method: 'PATCH', body: { branding } },
      );
      toast('success', `v${result.version} saved`);
      setDirty(new Set());
      await load(false);
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <div className="loading">Loading branding…</div>;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Branding</h2>
          <p className="page-sub">
            Logo, colors, slogan, chief executive and onboarding for the resident app.
          </p>
        </div>
        <div className="version-box">
          <span className="chip chip-blue" data-testid="config-version">
            config v{version ?? '…'}
          </span>
        </div>
      </div>
      <div className="branding-layout">
        <BrandingEditor
          form={form}
          tenantId={tenant.id}
          saving={saving}
          dirtyCount={dirty.size}
          onChange={handleChange}
          onSubmit={() => void handleSubmit()}
        />
        <div className="branding-side">
          <PhonePreview form={form} />
          <section className="panel history-panel">
            <h2 className="panel-title">Recent versions</h2>
            <ul className="history-list">
              {history.map((h) => (
                <li key={h.version}>
                  <span className="history-version">v{h.version}</span>
                  <span className="history-date">{new Date(h.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
