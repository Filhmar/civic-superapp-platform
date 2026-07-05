import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminApi, errorMessage } from '../lib/api';
import type { Tenant } from '../lib/types';
import StatusChip from '../components/StatusChip';
import { useToast } from '../components/Toast';

interface ModuleSummary {
  enabled: number;
  total: number;
}

export default function Tenants() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [summaries, setSummaries] = useState<Record<string, ModuleSummary>>({});

  useEffect(() => {
    let cancelled = false;
    AdminApi.tenants()
      .then((list) => {
        if (cancelled) return;
        setTenants(list);
        for (const t of list) {
          AdminApi.config(t.id)
            .then((cfg) => {
              if (cancelled) return;
              const mods = cfg.config.modules ?? {};
              setSummaries((prev) => ({
                ...prev,
                [t.id]: {
                  enabled: Object.values(mods).filter(Boolean).length,
                  total: Object.keys(mods).length,
                },
              }));
            })
            .catch(() => undefined);
        }
      })
      .catch((err) => toast.push(errorMessage(err), 'error'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <h2 className="page-title">Tenants</h2>
        <span className="muted">{tenants ? `${tenants.length} tenant${tenants.length === 1 ? '' : 's'}` : ''}</span>
      </div>
      <div className="card table-card">
        {!tenants ? (
          <div className="empty">Loading…</div>
        ) : tenants.length === 0 ? (
          <div className="empty">No tenants visible to this account.</div>
        ) : (
          <div className="table-scroll">
            <table className="table tenants-table">
              <thead>
                <tr>
                  <th>Tenant ID</th>
                  <th>Name</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Bundle ID</th>
                  <th>Modules</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => {
                  const s = summaries[t.id];
                  return (
                    <tr
                      key={t.id}
                      className="row-link"
                      data-tenant-id={t.id}
                      onClick={() => navigate(`/tenants/${t.id}`)}
                    >
                      <td className="mono">{t.id}</td>
                      <td className="strong">{t.name}</td>
                      <td>{t.kind}</td>
                      <td>
                        <StatusChip status={t.status} />
                      </td>
                      <td className="mono">{t.bundleId}</td>
                      <td>{s ? `${s.enabled}/${s.total} enabled` : '…'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
