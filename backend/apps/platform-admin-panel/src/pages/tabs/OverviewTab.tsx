import { useEffect, useState } from 'react';
import { AdminApi } from '../../lib/api';
import type { ConfigHistoryEntry, ConfigResponse } from '../../lib/types';

function fmt(ts: string): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function IntegrationRow({
  label,
  connected,
  text,
}: {
  label: string;
  connected: boolean;
  text: string;
}) {
  const color = connected ? '#1E8449' : '#B7791F';
  return (
    <div className="kv-row">
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      <span className="status-dot-row" style={{ color }}>
        <span className="dot" style={{ background: color }} />
        {text}
      </span>
    </div>
  );
}

export default function OverviewTab({ tenantId, cfg }: { tenantId: string; cfg: ConfigResponse }) {
  const [history, setHistory] = useState<ConfigHistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const c = cfg.config;

  useEffect(() => {
    let cancelled = false;
    AdminApi.configHistory(tenantId)
      .then((h) => {
        if (!cancelled) setHistory([...h].sort((a, b) => b.version - a.version));
      })
      .catch((err) => {
        if (!cancelled) setHistoryError(err instanceof Error ? err.message : 'Failed to load history');
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, cfg.version]);

  return (
    <div className="grid-overview">
      <section className="card">
        <span className="card-kicker">Version history</span>
        <div className="card-body">
          {historyError ? (
            <div className="form-error">{historyError}</div>
          ) : !history ? (
            <div className="empty">Loading…</div>
          ) : history.length === 0 ? (
            <div className="empty">No versions recorded.</div>
          ) : (
            history.map((h, i) => {
              const isCurrent = h.version === cfg.version;
              const note = isCurrent
                ? 'Latest configuration'
                : h.version === 1
                  ? 'Initial provisioning'
                  : 'Configuration change';
              return (
                <div key={h.version} className="timeline-row">
                  <div className="timeline-rail">
                    <span className={isCurrent ? 'timeline-dot current' : 'timeline-dot'} />
                    {i < history.length - 1 && <span className="timeline-connector" />}
                  </div>
                  <div className="timeline-body">
                    <div className="timeline-label">
                      v{h.version}
                      {isCurrent ? ' · current' : ''}
                    </div>
                    <div className="timeline-note">{note}</div>
                    <div className="timeline-time">{fmt(h.created_at)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <div className="stack">
        <section className="card">
          <span className="card-kicker">Identifiers</span>
          <div className="card-body">
            <div className="kv-row">
              <span className="kv-key">Ticket prefix</span>
              <span className="kv-val">
                {c.identifiers?.ticket_prefix ? `${c.identifiers.ticket_prefix}-000000` : '—'}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-key">Resident prefix</span>
              <span className="kv-val">
                {c.identifiers?.resident_id_prefix
                  ? `${c.identifiers.resident_id_prefix}-${new Date().getFullYear()}-`
                  : '—'}
              </span>
            </div>
            <div className="kv-row">
              <span className="kv-key">Locales</span>
              <span className="kv-val">{c.locales?.join(', ') || '—'}</span>
            </div>
            {cfg.app_min_supported_version && (
              <div className="kv-row">
                <span className="kv-key">Min app version</span>
                <span className="kv-val">{cfg.app_min_supported_version}</span>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <span className="card-kicker">Geography</span>
          <div className="card-body">
            <div className="kv-row">
              <span className="kv-key">Barangays</span>
              <span className="kv-val num">{c.geo?.units?.length ?? 0}</span>
            </div>
            <div className="kv-row">
              <span className="kv-key">Centroid</span>
              <span className="kv-val num">
                {c.geo?.centroid?.map((n) => n.toFixed(2)).join(', ') ?? '—'}
              </span>
            </div>
          </div>
        </section>

        <section className="card">
          <span className="card-kicker">Integrations</span>
          <div className="card-body">
            <IntegrationRow
              label="Weather"
              connected={Boolean(c.integrations?.weather)}
              text={c.integrations?.weather ? 'Connected' : 'Not set'}
            />
            <IntegrationRow
              label="SMS gateway"
              connected={Boolean(c.integrations?.sms)}
              text={c.integrations?.sms ? 'Connected' : 'Not set'}
            />
            <IntegrationRow
              label={
                c.integrations?.payments?.length
                  ? `Payments (${c.integrations.payments.join(', ')})`
                  : 'Payments'
              }
              connected={false}
              text={c.integrations?.payments?.length ? 'Sandbox' : 'Not set'}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
