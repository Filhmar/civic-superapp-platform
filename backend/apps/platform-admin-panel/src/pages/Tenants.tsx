import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, errorMessage } from '../lib/api';
import type { Tenant } from '../lib/types';
import StatusChip from '../components/StatusChip';
import ProvisionDrawer from '../components/ProvisionDrawer';
import { Icon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { useAdmin } from '../components/Layout';

interface TenantSummary {
  enabled: number;
  total: number;
  version: number;
  primary: string;
  prefix: string;
}

const FALLBACK_PRIMARY = '#5B5BD6';

function tilePrefix(t: Tenant, summary?: TenantSummary): string {
  if (summary?.prefix) return summary.prefix.slice(0, 3);
  return t.name.replace(/^My/, '').slice(0, 3).toUpperCase();
}

export default function Tenants() {
  const navigate = useNavigate();
  const toast = useToast();
  const admin = useAdmin();
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [summaries, setSummaries] = useState<Record<string, TenantSummary>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(() => {
    AdminApi.tenants()
      .then((list) => {
        setTenants(list);
        for (const t of list) {
          AdminApi.config(t.id)
            .then((cfg) => {
              const mods = cfg.config.modules ?? {};
              setSummaries((prev) => ({
                ...prev,
                [t.id]: {
                  enabled: Object.values(mods).filter(Boolean).length,
                  total: Object.keys(mods).length,
                  version: cfg.version,
                  primary: cfg.config.brand?.colors?.primary ?? FALLBACK_PRIMARY,
                  prefix: cfg.config.identifiers?.ticket_prefix ?? '',
                },
              }));
            })
            .catch(() => undefined);
        }
      })
      .catch((err) => toast.push(errorMessage(err), 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(load, [load]);

  const summaryList = tenants?.map((t) => summaries[t.id]).filter(Boolean) as
    | TenantSummary[]
    | undefined;
  const modulesLive = summaryList?.reduce((n, s) => n + s.enabled, 0) ?? 0;
  const versionsShipped = summaryList?.reduce((n, s) => n + s.version, 0) ?? 0;
  const activeCount = tenants?.filter((t) => t.status === 'active').length ?? 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="kicker">Multi-tenant estate</span>
          <h1 className="page-title">Tenants</h1>
        </div>
        {admin.role === 'platform_admin' && (
          <button
            className="btn btn-primary"
            onClick={() => setDrawerOpen(true)}
            data-testid="open-provision"
          >
            <Icon name="plus" />
            Provision new tenant
          </button>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Active tenants</div>
          <div className="stat-value stat-green">{tenants ? activeCount : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total modules live</div>
          <div className="stat-value stat-indigo">{summaryList?.length ? modulesLive : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Config versions shipped</div>
          <div className="stat-value stat-amber">{summaryList?.length ? versionsShipped : '—'}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="trow trow-head cols-tenants">
          <span>Tenant ID</span>
          <span>Name</span>
          <span>Kind</span>
          <span>Status</span>
          <span>Bundle ID</span>
          <span>Modules</span>
        </div>
        {!tenants ? (
          <div className="empty">Loading…</div>
        ) : tenants.length === 0 ? (
          <div className="empty">No tenants visible to this account.</div>
        ) : (
          tenants.map((t) => {
            const s = summaries[t.id];
            const primary = s?.primary ?? FALLBACK_PRIMARY;
            return (
              <button
                key={t.id}
                className="trow cols-tenants"
                data-tenant-id={t.id}
                onClick={() => navigate(`/tenants/${t.id}`)}
              >
                <span className="tenant-id-cell">
                  <span
                    className="tenant-tile"
                    style={{ background: primary, boxShadow: `0 3px 8px ${primary}66` }}
                  >
                    {tilePrefix(t, s)}
                  </span>
                  <span className="cell-mono-id">{t.id}</span>
                </span>
                <span className="cell-name">{t.name}</span>
                <span className="cell-meta">{t.kind}</span>
                <span>
                  <StatusChip status={t.status} />
                </span>
                <span className="cell-mono">{t.bundleId}</span>
                <span className="module-progress">
                  {s ? (
                    <>
                      <span className="progress-track">
                        <span
                          className="progress-fill"
                          style={{
                            display: 'block',
                            width: `${s.total ? Math.round((s.enabled / s.total) * 100) : 0}%`,
                            background: primary,
                          }}
                        />
                      </span>
                      <span className="progress-count">
                        {s.enabled}/{s.total}
                      </span>
                    </>
                  ) : (
                    <span className="skeleton" style={{ width: 70 }} />
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>

      {drawerOpen && (
        <ProvisionDrawer onClose={() => setDrawerOpen(false)} onProvisioned={load} />
      )}
    </div>
  );
}
