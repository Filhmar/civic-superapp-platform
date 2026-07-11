import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { api, ApiError } from '../lib/api';
import { useSession } from '../components/AuthLayout';
import { useToast } from '../components/Toasts';
import { StatusChip } from '../components/StatusChip';
import type {
  AssistanceRequest,
  EgovApplication,
  Report311,
  TimelineEntry,
} from '../lib/types';

// Legal transition maps (mirrors server-side state machines)
const REPORT_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['RESOLVED', 'REJECTED'],
};
const APPLICATION_TRANSITIONS: Record<string, string[]> = {
  PROCESSING: ['READY'],
  READY: ['CLAIMED'],
};
const ASSISTANCE_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'DENIED'],
  UNDER_REVIEW: ['APPROVED', 'DENIED'],
};

const REPORT_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
const APPLICATION_STATUSES = ['PENDING_PAYMENT', 'PROCESSING', 'READY', 'CLAIMED'];
const ASSISTANCE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED'];

// Terminal statuses render an italic "closed" note instead of actions.
const REPORT_TERMINAL = ['RESOLVED', 'REJECTED'];
const APPLICATION_TERMINAL = ['CLAIMED'];
const ASSISTANCE_TERMINAL = ['APPROVED', 'DENIED'];

interface PendingAction {
  id: string;
  to: string;
}

function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <details className="timeline">
      <summary>Timeline ({entries.length})</summary>
      <ul>
        {entries.map((t, i) => (
          <li key={i}>
            <span className="timeline-status">
              {(t.from ?? 'START').replace(/_/g, ' ')} → {t.to.replace(/_/g, ' ')}
            </span>
            <span className="timeline-actor">{t.actor}</span>
            <span className="timeline-at">{new Date(t.at).toLocaleString()}</span>
            {t.note && <span className="timeline-note">“{t.note}”</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Dialog chrome colors by TARGET STATUS FAMILY (amber for forward, green/red terminal). */
const TONE_COLORS: Record<string, string> = {
  RESOLVED: '#1E8449',
  APPROVED: '#1E8449',
  READY: '#1E8449',
  CLAIMED: '#1E8449',
  UNDER_REVIEW: '#B7791F',
  PROCESSING: '#B7791F',
  REJECTED: '#C0392B',
  DENIED: '#C0392B',
};

const ACTION_LABELS: Record<string, string> = {
  UNDER_REVIEW: 'Start review',
  RESOLVED: 'Resolve',
  REJECTED: 'Reject',
  APPROVED: 'Approve',
  DENIED: 'Deny',
  PROCESSING: 'Mark paid',
  READY: 'Mark ready',
  CLAIMED: 'Mark claimed',
};

function actionLabel(to: string): string {
  return ACTION_LABELS[to] ?? to.replace(/_/g, ' ');
}

/** Tinted row-action button colors by ACTION DIRECTION: forward = tenant primary. */
function actionStyle(to: string): CSSProperties {
  if (to === 'REJECTED' || to === 'DENIED') {
    return {
      background: 'rgba(192, 57, 43, 0.1)',
      color: '#C0392B',
      border: '1px solid rgba(192, 57, 43, 0.25)',
    };
  }
  if (to === 'UNDER_REVIEW' || to === 'PROCESSING') {
    return {
      background: 'var(--primary-a10)',
      color: 'var(--primary)',
      border: '1px solid var(--primary-a25)',
    };
  }
  return {
    background: 'rgba(30, 132, 73, 0.1)',
    color: '#1E8449',
    border: '1px solid rgba(30, 132, 73, 0.25)',
  };
}

interface TransitionDialogProps {
  to: string;
  /** Mono id shown under the dialog title (ticket/stub/request id). */
  subject: string;
  needsClaimFields: boolean;
  busy: boolean;
  onConfirm: (note: string, claimSchedule?: string, claimLocation?: string) => void;
  onCancel: () => void;
}

/** Status-family-colored transition dialog. */
function TransitionDialog({
  to,
  subject,
  needsClaimFields,
  busy,
  onConfirm,
  onCancel,
}: TransitionDialogProps) {
  const [note, setNote] = useState('');
  const [claimSchedule, setClaimSchedule] = useState('');
  const [claimLocation, setClaimLocation] = useState('');
  const color = TONE_COLORS[to] ?? '#1E8449';
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className="dialog" role="dialog" aria-modal="true" data-testid="transition-dialog">
        <div className="dialog-head">
          <span className="dialog-icon" style={{ background: `${color}1F`, color }} aria-hidden>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <div>
            <div className="dialog-title">{actionLabel(to)}</div>
            <div className="dialog-sub">{subject}</div>
          </div>
        </div>
        <div className="dialog-fields">
          <label>
            <span className="field-label">Note (attached to audit trail)</span>
            <textarea
              placeholder="Add a note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {needsClaimFields && (
            <div className="dialog-grid-2">
              <label>
                <span className="field-label">Claim date</span>
                <input
                  type="text"
                  placeholder="2026-07-15"
                  value={claimSchedule}
                  onChange={(e) => setClaimSchedule(e.target.value)}
                />
              </label>
              <label>
                <span className="field-label">Claim location</span>
                <input
                  type="text"
                  placeholder="City Hall · Window 4"
                  value={claimLocation}
                  onChange={(e) => setClaimLocation(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>
        <div className="dialog-foot">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-status"
            style={{ background: color }}
            disabled={busy}
            onClick={() => onConfirm(note, claimSchedule || undefined, claimLocation || undefined)}
          >
            {busy ? 'Applying…' : actionLabel(to)}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Generic hook: list + transition submit for one ops domain (filter state lifted). */
function useOpsList<T>(
  listPath: string,
  transitionPathFor: (id: string) => string,
  status: string,
  onCount: (n: number) => void,
) {
  const toast = useToast();
  const [items, setItems] = useState<T[] | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const data = await api<T[]>(`${listPath}${qs}`);
    setItems(data);
    if (!status) onCount(data.length);
  }, [listPath, status, onCount]);

  useEffect(() => {
    setItems(null);
    void load().catch((err: unknown) => {
      toast('error', err instanceof ApiError ? err.message : 'Failed to load list');
    });
  }, [load, toast]);

  async function confirm(
    id: string,
    to: string,
    note: string,
    claimSchedule?: string,
    claimLocation?: string,
  ) {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { to };
      if (note) body.note = note;
      if (claimSchedule) body.claim_schedule = claimSchedule;
      if (claimLocation) body.claim_location = claimLocation;
      await api(transitionPathFor(id), { method: 'POST', body });
      toast('success', `Status updated → ${to.replace(/_/g, ' ')}`);
      setPending(null);
      await load();
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Transition failed');
    } finally {
      setBusy(false);
    }
  }

  return { items, pending, setPending, busy, confirm };
}

function ActionCell({
  status,
  id,
  transitions,
  terminal,
  onAction,
}: {
  status: string;
  id: string;
  transitions: Record<string, string[]>;
  terminal: string[];
  onAction: (pending: PendingAction) => void;
}) {
  const actions = transitions[status] ?? [];
  if (actions.length === 0) {
    return terminal.includes(status) ? <span className="closed-note">closed</span> : null;
  }
  return (
    <>
      {actions.map((to) => (
        <button
          key={to}
          type="button"
          className="action-btn"
          style={actionStyle(to)}
          onClick={() => onAction({ id, to })}
        >
          {actionLabel(to)}
        </button>
      ))}
    </>
  );
}

interface TableProps {
  tenantId: string;
  status: string;
  onCount: (n: number) => void;
}

function ReportsTable({ tenantId, status, onCount }: TableProps) {
  const base = `/admin/tenants/${tenantId}/reports`;
  const ops = useOpsList<Report311>(base, (id) => `${base}/${id}/transition`, status, onCount);

  return (
    <section className="table-card" data-testid="ops-reports">
      {ops.items === null ? (
        <div className="loading" style={{ padding: '18px 22px' }}>
          Loading…
        </div>
      ) : ops.items.length === 0 ? (
        <p className="table-empty">No reports.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Category</th>
                <th>Department</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {ops.items.map((r) => (
                <tr key={r.ticket_id}>
                  <td className="mono">
                    {r.ticket_id}
                    <Timeline entries={r.timeline} />
                  </td>
                  <td className="desc-cell">
                    {r.category.label}
                    <div className="cell-sub">{r.description}</div>
                  </td>
                  <td className="cell-muted">{r.department}</td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                  <td className="cell-actions">
                    {ops.pending?.id === r.ticket_id && (
                      <TransitionDialog
                        to={ops.pending.to}
                        subject={r.ticket_id}
                        needsClaimFields={false}
                        busy={ops.busy}
                        onConfirm={(note) => void ops.confirm(r.ticket_id, ops.pending!.to, note)}
                        onCancel={() => ops.setPending(null)}
                      />
                    )}
                    <ActionCell
                      status={r.status}
                      id={r.ticket_id}
                      transitions={REPORT_TRANSITIONS}
                      terminal={REPORT_TERMINAL}
                      onAction={ops.setPending}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ApplicationsTable({ tenantId, status, onCount }: TableProps) {
  const base = `/admin/tenants/${tenantId}/applications`;
  const ops = useOpsList<EgovApplication>(
    base,
    (stubId) => `${base}/${stubId}/transition`,
    status,
    onCount,
  );

  return (
    <section className="table-card" data-testid="ops-applications">
      {ops.items === null ? (
        <div className="loading" style={{ padding: '18px 22px' }}>
          Loading…
        </div>
      ) : ops.items.length === 0 ? (
        <p className="table-empty">No applications.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Stub</th>
                <th>Service</th>
                <th>Fees</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {ops.items.map((a) => (
                <tr key={a.stub_id}>
                  <td className="mono">
                    {a.stub_id}
                    <Timeline entries={a.timeline} />
                  </td>
                  <td>
                    {a.service.name}
                    <div className="cell-sub">{a.service.group}</div>
                  </td>
                  <td className="cell-muted">
                    ₱{a.fees.fee.toFixed(2)} + ₱{a.fees.convenience_fee.toFixed(2)}
                    {(a.window_no || a.ready_eta) && (
                      <div className="cell-sub">
                        {a.window_no ? `Window ${a.window_no}` : ''}
                        {a.window_no && a.ready_eta ? ' · ' : ''}
                        {a.ready_eta ? `ETA ${new Date(a.ready_eta).toLocaleDateString()}` : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusChip status={a.status} />
                  </td>
                  <td className="cell-actions">
                    {ops.pending?.id === a.stub_id && (
                      <TransitionDialog
                        to={ops.pending.to}
                        subject={a.stub_id}
                        needsClaimFields={false}
                        busy={ops.busy}
                        onConfirm={(note) => void ops.confirm(a.stub_id, ops.pending!.to, note)}
                        onCancel={() => ops.setPending(null)}
                      />
                    )}
                    <ActionCell
                      status={a.status}
                      id={a.stub_id}
                      transitions={APPLICATION_TRANSITIONS}
                      terminal={APPLICATION_TERMINAL}
                      onAction={ops.setPending}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AssistanceTable({ tenantId, status, onCount }: TableProps) {
  const base = `/admin/tenants/${tenantId}/assistance`;
  const ops = useOpsList<AssistanceRequest>(
    base,
    (id) => `${base}/${id}/transition`,
    status,
    onCount,
  );

  return (
    <section className="table-card" data-testid="ops-assistance">
      {ops.items === null ? (
        <div className="loading" style={{ padding: '18px 22px' }}>
          Loading…
        </div>
      ) : ops.items.length === 0 ? (
        <p className="table-empty">No assistance requests.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Program</th>
                <th>Checklist</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {ops.items.map((r) => (
                <tr key={r.request_id}>
                  <td className="mono">
                    {r.request_id}
                    <Timeline entries={r.timeline} />
                  </td>
                  <td>
                    {r.program.name}
                    <div className="cell-sub">{r.office}</div>
                  </td>
                  <td className="cell-muted">
                    {r.checklist.filter((c) => c.provided).length}/{r.checklist.length} checklist
                    {r.claim_schedule && (
                      <div className="cell-sub">
                        Claim {r.claim_schedule}
                        {r.claim_location ? ` · ${r.claim_location}` : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                  <td className="cell-actions">
                    {ops.pending?.id === r.request_id && (
                      <TransitionDialog
                        to={ops.pending.to}
                        subject={r.request_id}
                        needsClaimFields={ops.pending.to === 'APPROVED'}
                        busy={ops.busy}
                        onConfirm={(note, cs, cl) =>
                          void ops.confirm(r.request_id, ops.pending!.to, note, cs, cl)
                        }
                        onCancel={() => ops.setPending(null)}
                      />
                    )}
                    <ActionCell
                      status={r.status}
                      id={r.request_id}
                      transitions={ASSISTANCE_TRANSITIONS}
                      terminal={ASSISTANCE_TERMINAL}
                      onAction={ops.setPending}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type TabKey = 'reports' | 'egov' | 'assist';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'reports', label: '311 Reports' },
  { key: 'egov', label: 'e-Gov Applications' },
  { key: 'assist', label: 'Assistance' },
];

const TAB_STATUSES: Record<TabKey, string[]> = {
  reports: REPORT_STATUSES,
  egov: APPLICATION_STATUSES,
  assist: ASSISTANCE_STATUSES,
};

export function Operations() {
  const { tenant } = useSession();
  const [tab, setTab] = useState<TabKey>('reports');
  const [counts, setCounts] = useState<Record<TabKey, number | null>>({
    reports: null,
    egov: null,
    assist: null,
  });
  const [filters, setFilters] = useState<Record<TabKey, string>>({
    reports: '',
    egov: '',
    assist: '',
  });

  const countSetter = useCallback(
    (key: TabKey) => (n: number) =>
      setCounts((c) => (c[key] === n ? c : { ...c, [key]: n })),
    [],
  );
  // Stable per-tab callbacks so useOpsList's load() identity stays put.
  const [countCallbacks] = useState(() => ({
    reports: countSetter('reports'),
    egov: countSetter('egov'),
    assist: countSetter('assist'),
  }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">Service desk</div>
          <h2 className="page-title">Operations</h2>
        </div>
      </div>
      <div className="ops-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`ops-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {counts[t.key] !== null && <span className="ops-tab-count">{counts[t.key]}</span>}
          </button>
        ))}
        <select
          className="status-filter"
          aria-label="Filter by status"
          value={filters[tab]}
          onChange={(e) => setFilters((f) => ({ ...f, [tab]: e.target.value }))}
        >
          <option value="">All statuses</option>
          {TAB_STATUSES[tab].map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>
      <div style={tab === 'reports' ? undefined : { display: 'none' }}>
        <ReportsTable
          tenantId={tenant.id}
          status={filters.reports}
          onCount={countCallbacks.reports}
        />
      </div>
      <div style={tab === 'egov' ? undefined : { display: 'none' }}>
        <ApplicationsTable
          tenantId={tenant.id}
          status={filters.egov}
          onCount={countCallbacks.egov}
        />
      </div>
      <div style={tab === 'assist' ? undefined : { display: 'none' }}>
        <AssistanceTable
          tenantId={tenant.id}
          status={filters.assist}
          onCount={countCallbacks.assist}
        />
      </div>
    </div>
  );
}
