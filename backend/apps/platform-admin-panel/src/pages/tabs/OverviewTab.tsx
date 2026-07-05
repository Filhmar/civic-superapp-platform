import { useEffect, useState } from 'react';
import { AdminApi } from '../../lib/api';
import type { ConfigHistoryEntry, ConfigResponse } from '../../lib/types';

function fmt(ts: string): string {
  return new Date(ts).toLocaleString();
}

export default function OverviewTab({ tenantId, cfg }: { tenantId: string; cfg: ConfigResponse }) {
  const [history, setHistory] = useState<ConfigHistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const c = cfg.config;

  useEffect(() => {
    let cancelled = false;
    AdminApi.configHistory(tenantId)
      .then((h) => {
        if (!cancelled) setHistory(h);
      })
      .catch((err) => {
        if (!cancelled) setHistoryError(err instanceof Error ? err.message : 'Failed to load history');
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, cfg.version]);

  return (
    <div className="grid-2 align-start">
      <div className="stack">
        <section className="card">
          <h3 className="card-title">Configuration</h3>
          <dl className="kv">
            <div>
              <dt>Current version</dt>
              <dd>
                <span className="version-badge">v{cfg.version}</span>
              </dd>
            </div>
            {cfg.app_min_supported_version && (
              <div>
                <dt>Min app version</dt>
                <dd className="mono">{cfg.app_min_supported_version}</dd>
              </div>
            )}
            <div>
              <dt>Locales</dt>
              <dd>{c.locales?.join(', ') || '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h3 className="card-title">Identifiers</h3>
          <dl className="kv">
            <div>
              <dt>Ticket prefix</dt>
              <dd className="mono">{c.identifiers?.ticket_prefix ?? '—'}</dd>
            </div>
            <div>
              <dt>Resident ID prefix</dt>
              <dd className="mono">{c.identifiers?.resident_id_prefix ?? '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h3 className="card-title">Geography</h3>
          <dl className="kv">
            <div>
              <dt>Geo units</dt>
              <dd>{c.geo?.units?.length ?? 0} units</dd>
            </div>
            <div>
              <dt>Centroid</dt>
              <dd className="mono">{c.geo?.centroid?.join(', ') ?? '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h3 className="card-title">Integrations</h3>
          <dl className="kv">
            <div>
              <dt>Weather</dt>
              <dd>{c.integrations?.weather ?? '—'}</dd>
            </div>
            <div>
              <dt>SMS</dt>
              <dd>{c.integrations?.sms ?? '—'}</dd>
            </div>
            <div>
              <dt>Payments</dt>
              <dd>{c.integrations?.payments?.length ? c.integrations.payments.join(', ') : '—'}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="card">
        <h3 className="card-title">Version history</h3>
        {historyError ? (
          <div className="form-error">{historyError}</div>
        ) : !history ? (
          <div className="empty">Loading…</div>
        ) : history.length === 0 ? (
          <div className="empty">No versions recorded.</div>
        ) : (
          <ul className="history-list">
            {history.map((h) => (
              <li key={h.version} className={h.version === cfg.version ? 'history-item current' : 'history-item'}>
                <span className="version-badge">v{h.version}</span>
                <span className="muted">{fmt(h.created_at)}</span>
                {h.version === cfg.version && <span className="chip chip-green">current</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
