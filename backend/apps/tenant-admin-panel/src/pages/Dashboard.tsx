import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useSession } from '../components/AuthLayout';
import { useToast } from '../components/Toasts';
import { CatChip, fmtShort } from '../components/CatChip';
import { Icon } from '../components/Icons';
import type { IconName } from '../components/Icons';
import type {
  AssistanceRequest,
  AuditEvent,
  ConfigResponse,
  EgovApplication,
  Report311,
} from '../lib/types';

interface DashboardData {
  configVersion: number;
  slogan: string;
  openReports: number;
  activeApplications: number;
  pendingAssistance: number;
  latestAudit: AuditEvent[];
}

interface StatCard {
  label: string;
  value: string;
  testid: string;
  icon: IconName;
  tileBg: string;
  tileFg: string;
  glow: string;
  accentValue?: boolean;
}

const QUICK_LINKS: {
  to: string;
  title: string;
  sub: string;
  icon: IconName;
  bg: string;
  fg: string;
}[] = [
  {
    to: '/branding',
    title: 'Branding Studio',
    sub: 'Edit colors, slogan, logos',
    icon: 'branding',
    bg: 'var(--primary-soft)',
    fg: 'var(--primary)',
  },
  {
    to: '/content',
    title: 'Compose a post',
    sub: 'Publish city news',
    icon: 'content',
    bg: 'var(--accent-soft)',
    fg: 'var(--accent-deep)',
  },
  {
    to: '/operations',
    title: 'Service desk',
    sub: 'Reports, e-Gov, assistance',
    icon: 'operations',
    bg: '#E6F5EC',
    fg: '#1E8449',
  },
];

export function Dashboard() {
  const { tenant, admin } = useSession();
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
          slogan: cfg.config?.brand?.slogan ?? '',
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

  const firstName = admin.name.split(/\s+/)[0] ?? admin.name;

  const cards: StatCard[] = [
    {
      label: 'Open reports',
      value: String(data.openReports),
      testid: 'card-open-reports',
      icon: 'alert-triangle',
      tileBg: '#FDECEC',
      tileFg: '#C0392B',
      glow: 'rgba(192, 57, 43, 0.06)',
    },
    {
      label: 'Applications in progress',
      value: String(data.activeApplications),
      testid: 'card-applications',
      icon: 'bank',
      tileBg: 'var(--primary-soft)',
      tileFg: 'var(--primary)',
      glow: 'var(--primary-a06)',
    },
    {
      label: 'Assistance pending',
      value: String(data.pendingAssistance),
      testid: 'card-assistance',
      icon: 'heart',
      tileBg: 'var(--accent-soft)',
      tileFg: 'var(--accent-deep)',
      glow: 'var(--accent-a06)',
    },
    {
      label: 'Config version',
      value: `v${data.configVersion}`,
      testid: 'card-config-version',
      icon: 'brush',
      tileBg: 'var(--accent-soft)',
      tileFg: 'var(--accent-deep)',
      glow: 'var(--accent-a06)',
      accentValue: true,
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          {data.slogan && <div className="page-kicker">{data.slogan}</div>}
          <h2 className="page-title">Kumusta, {firstName} 👋</h2>
        </div>
      </div>
      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label} data-testid={c.testid}>
            <span className="stat-glow" style={{ background: c.glow }} aria-hidden />
            <span className="stat-icon" style={{ background: c.tileBg, color: c.tileFg }}>
              <Icon name={c.icon} />
            </span>
            <div className={`stat-value${c.accentValue ? ' stat-accent' : ''}`}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="dash-body">
        <section className="panel">
          <div className="panel-head">
            <h2 className="card-title">Latest activity</h2>
            <Link className="text-link" to="/audit">
              View audit log →
            </Link>
          </div>
          {data.latestAudit.length === 0 ? (
            <p className="empty">No audit events yet.</p>
          ) : (
            <ul className="audit-list">
              {data.latestAudit.map((ev) => (
                <li key={ev.id} className="activity-row">
                  <CatChip category={ev.category} />
                  <span className="activity-title">{ev.title}</span>
                  <span className="activity-time">{fmtShort(ev.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div>
          <div className="panel-title">Quick links</div>
          <div className="quick-links">
            {QUICK_LINKS.map((q) => (
              <Link className="quick-link" to={q.to} key={q.to}>
                <span className="quick-link-icon" style={{ background: q.bg, color: q.fg }}>
                  <Icon name={q.icon} />
                </span>
                <span className="quick-link-body">
                  <span className="quick-link-title">{q.title}</span>
                  <div className="quick-link-sub">{q.sub}</div>
                </span>
                <Icon name="chevron-right" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
