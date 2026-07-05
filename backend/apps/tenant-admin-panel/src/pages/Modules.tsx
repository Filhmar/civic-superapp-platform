import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useSession } from '../components/AuthLayout';
import { useToast } from '../components/Toasts';
import type { ConfigResponse } from '../lib/types';

const MODULE_LABELS: Record<string, string> = {
  egov: 'eGov services',
  reports311: 'Reports 311',
  assistance: 'Assistance programs',
  sos: 'SOS / emergency',
  news: 'News & advisories',
  tourism: 'Tourism',
  directory: 'Directory',
  transport: 'Transport',
  health: 'Health',
  jobs: 'Jobs',
};

export function Modules() {
  const { tenant } = useSession();
  const toast = useToast();
  const [modules, setModules] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api<ConfigResponse>(`/admin/tenants/${tenant.id}/config`)
      .then((cfg) => {
        if (!cancelled) setModules(cfg.config.modules ?? {});
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast('error', err instanceof ApiError ? err.message : 'Failed to load modules');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tenant.id, toast]);

  if (!modules) return <div className="loading">Loading modules…</div>;

  const entries = Object.entries(modules).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Modules</h2>
          <p className="page-sub">Feature modules currently provisioned for this city.</p>
        </div>
      </div>
      <div className="note-banner" data-testid="modules-note">
        Module availability is managed by the platform operator. Contact your platform
        representative to enable or disable a module.
      </div>
      <section className="panel">
        <ul className="module-list" data-testid="module-list">
          {entries.map(([key, enabled]) => (
            <li key={key} className="module-row">
              <span className="module-name">{MODULE_LABELS[key] ?? key}</span>
              <span className="module-key">{key}</span>
              <span className={`chip ${enabled ? 'chip-green' : 'chip-gray'}`}>
                {enabled ? 'Enabled' : 'Disabled'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
