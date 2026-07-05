import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useSession } from '../components/AuthLayout';
import { useToast } from '../components/Toasts';
import type {
  AssistanceRequest,
  AuditEvent,
  ConfigResponse,
  EgovApplication,
  Report311,
} from '../lib/types';

interface DashboardData {
  configVersion: number;
  openReports: number;
  activeApplications: number;
  pendingAssistance: number;
  latestAudit: AuditEvent[];
}

export function Dashboard() {
  const { tenant } = useSession();
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const base = `/admin/tenants/${tenant.id}`;
        const [cfg, reports, applications, assistance, audit] = await Promise.all([
          api<ConfigResponse>(`${base}/config`),
          api<Report311[]>(`${base}/reports`),
          api<EgovApplication[]>(`${base}/applications`),
          api<AssistanceRequest[]>(`${base}/assistance`),
          api<AuditEvent[]>(`${base}/audit`),
        ]);
        if (cancelled) return;
        setData({
          configVersion: cfg.version,
          openReports: reports.filter((r) => ['SUBMITTED', 'UNDER_REVIEW'].includes(r.status))
            .length,
          activeApplications: applications.filter((a) =>
            ['PROCESSING', 'READY'].includes(a.status),
          ).length,
          pendingAssistance: assistance.filter((a) =>
            ['SUBMITTED', 'UNDER_REVIEW'].includes(a.status),
          ).length,
          latestAudit: audit.slice(0, 5),
        });
      } catch (err) {
        if (!cancelled) {
          toast('error', err instanceof ApiError ? err.message : 'Failed to load dashboard');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant.id, toast]);

  if (!data) return <div className="loading">Loading dashboard…</div>;

  const cards = [
    { label: 'Config version', value: `v${data.configVersion}`, testid: 'card-config-version' },
    { label: 'Open reports', value: String(data.openReports), testid: 'card-open-reports' },
    {
      label: 'Applications in progress',
      value: String(data.activeApplications),
      testid: 'card-applications',
    },
    {
      label: 'Assistance pending review',
      value: String(data.pendingAssistance),
      testid: 'card-assistance',
    },
  ];

  return (
    <div className="page">
      <div className="stat-grid">
        {cards.map((c) => (
          <div className="panel stat-card" key={c.label} data-testid={c.testid}>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2 className="panel-title">Latest activity</h2>
        {data.latestAudit.length === 0 ? (
          <p className="empty">No audit events yet.</p>
        ) : (
          <ul className="audit-list">
            {data.latestAudit.map((ev) => (
              <li key={ev.id} className="audit-row">
                <span className="chip chip-gray audit-cat">{ev.category}</span>
                <span className="audit-title">{ev.title}</span>
                <span className="audit-time">{new Date(ev.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
