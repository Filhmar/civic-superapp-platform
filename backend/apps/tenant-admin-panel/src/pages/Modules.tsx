import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useSession } from '../components/AuthLayout';
import { useToast } from '../components/Toasts';
import { Icon } from '../components/Icons';
import type { IconName } from '../components/Icons';
import type { ConfigResponse } from '../lib/types';

/** Display metadata per module key — the ORDER matches the design spec. */
const MODULE_META: { key: string; label: string; desc: string; icon: IconName }[] = [
  { key: 'egov', label: 'e-Gov Services', desc: 'Pay taxes, permits, certificates', icon: 'bank' },
  { key: 'reports311', label: 'Report a Problem', desc: '311-style issue reporting', icon: 'alert-triangle' },
  { key: 'assistance', label: 'Assistance', desc: 'Social welfare requests', icon: 'heart' },
  { key: 'sos', label: 'Emergency SOS', desc: 'Hold-to-SOS + live location', icon: 'alert' },
  { key: 'news', label: 'News & Advisories', desc: 'PIO posts & alerts', icon: 'news' },
  { key: 'tourism', label: 'Tourism', desc: 'City guide & destinations', icon: 'map-pin' },
  { key: 'directory', label: 'Directory', desc: 'Business listings', icon: 'bag' },
  { key: 'transport', label: 'Transport', desc: 'Routes, fares, terminals', icon: 'bus' },
  { key: 'health', label: 'Health', desc: 'Health services', icon: 'operations' },
  { key: 'jobs', label: 'Jobs', desc: 'City job portal', icon: 'briefcase' },
];

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

  // Known modules in design order first, then any extra keys from config.
  const known = MODULE_META.filter((m) => m.key in modules);
  const extras = Object.keys(modules)
    .filter((k) => !MODULE_META.some((m) => m.key === k))
    .sort()
    .map((key) => ({ key, label: key, desc: key, icon: 'modules' as IconName }));
  const entries = [...known, ...extras];

  return (
    <div className="page page-modules">
      <div className="page-head">
        <div>
          <div className="page-kicker">Subscription</div>
          <h2 className="page-title">Modules</h2>
        </div>
      </div>
      <div className="note-banner" data-testid="modules-note">
        <Icon name="lock" />
        <span>
          Module availability is managed by the platform operator. Contact your account manager to
          change your subscription tier.
        </span>
      </div>
      <ul className="module-list" data-testid="module-list">
        {entries.map((m) => {
          const enabled = modules[m.key];
          return (
            <li key={m.key} className={`module-row${enabled ? '' : ' module-off'}`}>
              <span className="module-icon" aria-hidden>
                <Icon name={m.icon} />
              </span>
              <span className="module-body">
                <div className="module-name">{m.label}</div>
                <div className="module-desc">{m.desc}</div>
              </span>
              <span className={`module-tag ${enabled ? 'tag-included' : 'tag-addon'}`}>
                {enabled ? 'Included' : 'Add-on'}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
