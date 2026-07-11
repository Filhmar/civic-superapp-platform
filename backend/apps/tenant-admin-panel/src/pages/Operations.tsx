import { useCallback, useEffect, useState } from 'react';
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
            <span className="timeline-status">{(t.from ?? 'START').replace(/_/g, ' ')} → {t.to.replace(/_/g, ' ')}</span>
            <span className="timeline-actor">{t.actor}</span>
            <span className="timeline-at">{new Date(t.at).toLocaleString()}</span>
            {t.note && <span className="timeline-note">“{t.note}”</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}

interface TransitionBarProps {
  to: string;
  /** Mono id shown under the dialog title (ticket/stub/request id). */
  subject: string;
  needsClaimFields: boolean;
  busy: boolean;
  onConfirm: (note: string, claimSchedule?: string, claimLocation?: string) => void;
  onCancel: () => void;
}

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
  READY: 'Mark ready',
  CLAIMED: 'Mark claimed',
};

function actionLabel(to: string): string {
  return ACTION_LABELS[to] ?? to.replace(/_/g, ' ');
}

/** Status-colored transition dialog (design-language overlay, replaces the inline bar). */
function TransitionBar({ to, subject, needsClaimFields, busy, onConfirm, onCancel }: TransitionBarProps) {
  const [note, setNote] = useState('');
  const [claimSchedule, setClaimSchedule] = useState('');
  const [claimLocation, setClaimLocation] = useState('');
  const color = TONE_COLORS[to] ?? '#1E8449';
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className="dialog" role="dialog" aria-modal="true" data-testid="transition-dialog">
        <div className="dialog-head">
          <span className="dialog-icon" style={{ background: `${color}1F`, color }} aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <div>
            <div className="dialog-title">{actionLabel(to)}</div>
            <div className="dialog-sub">{subject}</div>
          </div>
        </div>
        <div className="dialog-fields">
          {needsClaimFields && (
            <div className="dialog-grid-2">
              <label>
                <span className="field-label">Claim date</span>
                <input
                  type="text"
                  placeholder="2026-07-10 09:00"
                  value={claimSchedule}
                  onChange={(e) => setClaimSchedule(e.target.value)}
                />
              </label>
              <label>
                <span className="field-label">Claim location</span>
                <input
                  type="text"
                  placeholder="e.g. City Hall, Window 3"
                  value={claimLocation}
                  onChange={(e) => setClaimLocation(e.target.value)}
                />
              </label>
            </div>
          )}
          <label>
            <span className="field-label">Note (attached to audit trail)</span>
            <textarea
              placeholder="Add a note for this transition…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
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

function StatusFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select className="status-filter" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All statuses</option>
      {options.map((s) => (
        <option key={s} value={s}>
          {s.replace(/_/g, ' ')}
        </option>
      ))}
    </select>
  );
}

/** Generic hook: list + status filter + transition submit for one ops domain. */
function useOpsList<T>(listPath: string, transitionPathFor: (id: string) => string) {
  const toast = useToast();
  const [items, setItems] = useState<T[] | null>(null);
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const data = await api<T[]>(`${listPath}${qs}`);
    setItems(data);
  }, [listPath, status]);

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
      toast('success', `${id} → ${to.replace(/_/g, ' ')}`);
      setPending(null);
      await load();
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Transition failed');
    } finally {
      setBusy(false);
    }
  }

  return { items, status, setStatus, pending, setPending, busy, confirm };
}

function ReportsTable({ tenantId }: { tenantId: string }) {
  const base = `/admin/tenants/${tenantId}/reports`;
  const ops = useOpsList<Report311>(base, (id) => `${base}/${id}/transition`);

  return (
    <section className="panel" data-testid="ops-reports">
      <div className="panel-head">
        <h2 className="panel-title">Reports 311</h2>
        <StatusFilter value={ops.status} options={REPORT_STATUSES} onChange={ops.setStatus} />
      </div>
      {ops.items === null ? (
        <div className="loading">Loading…</div>
      ) : ops.items.length === 0 ? (
        <p className="empty">No reports.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Category</th>
                <th>Department</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ops.items.map((r) => (
                <tr key={r.ticket_id}>
                  <td className="mono">{r.ticket_id}</td>
                  <td>{r.category.label}</td>
                  <td>{r.department}</td>
                  <td className="desc-cell">
                    {r.description}
                    <Timeline entries={r.timeline} />
                  </td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                  <td>
                    {ops.pending?.id === r.ticket_id && (
                      <TransitionBar
                        to={ops.pending.to}
                        subject={r.ticket_id}
                        needsClaimFields={false}
                        busy={ops.busy}
                        onConfirm={(note) => void ops.confirm(r.ticket_id, ops.pending!.to, note)}
                        onCancel={() => ops.setPending(null)}
                      />
                    )}
                    {(REPORT_TRANSITIONS[r.status] ?? []).map((to) => (
                      <button
                        key={to}
                        type="button"
                        className="action-btn"
                        onClick={() => ops.setPending({ id: r.ticket_id, to })}
                      >
                        {actionLabel(to)}
                      </button>
                    ))}
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

function ApplicationsTable({ tenantId }: { tenantId: string }) {
  const base = `/admin/tenants/${tenantId}/applications`;
  const ops = useOpsList<EgovApplication>(base, (stubId) => `${base}/${stubId}/transition`);

  return (
    <section className="panel" data-testid="ops-applications">
      <div className="panel-head">
        <h2 className="panel-title">eGov applications</h2>
        <StatusFilter value={ops.status} options={APPLICATION_STATUSES} onChange={ops.setStatus} />
      </div>
      {ops.items === null ? (
        <div className="loading">Loading…</div>
      ) : ops.items.length === 0 ? (
        <p className="empty">No applications.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Stub</th>
                <th>Service</th>
                <th>Fees</th>
                <th>Window</th>
                <th>Ready ETA</th>
                <th>Status</th>
                <th>Actions</th>
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
                  <td>
                    ₱{a.fees.total.toFixed(2)}
                    <div className="cell-sub">
                      fee ₱{a.fees.fee} + conv ₱{a.fees.convenience_fee}
                    </div>
                  </td>
                  <td>{a.window_no ?? '—'}</td>
                  <td>{a.ready_eta ? new Date(a.ready_eta).toLocaleString() : '—'}</td>
                  <td>
                    <StatusChip status={a.status} />
                  </td>
                  <td>
                    {ops.pending?.id === a.stub_id && (
                      <TransitionBar
                        to={ops.pending.to}
                        subject={a.stub_id}
                        needsClaimFields={false}
                        busy={ops.busy}
                        onConfirm={(note) => void ops.confirm(a.stub_id, ops.pending!.to, note)}
                        onCancel={() => ops.setPending(null)}
                      />
                    )}
                    {(APPLICATION_TRANSITIONS[a.status] ?? []).map((to) => (
                      <button
                        key={to}
                        type="button"
                        className="action-btn"
                        onClick={() => ops.setPending({ id: a.stub_id, to })}
                      >
                        {actionLabel(to)}
                      </button>
                    ))}
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

function AssistanceTable({ tenantId }: { tenantId: string }) {
  const base = `/admin/tenants/${tenantId}/assistance`;
  const ops = useOpsList<AssistanceRequest>(base, (id) => `${base}/${id}/transition`);

  return (
    <section className="panel" data-testid="ops-assistance">
      <div className="panel-head">
        <h2 className="panel-title">Assistance requests</h2>
        <StatusFilter value={ops.status} options={ASSISTANCE_STATUSES} onChange={ops.setStatus} />
      </div>
      {ops.items === null ? (
        <div className="loading">Loading…</div>
      ) : ops.items.length === 0 ? (
        <p className="empty">No assistance requests.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Request</th>
                <th>Program</th>
                <th>Office</th>
                <th>Checklist</th>
                <th>Claim</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ops.items.map((r) => (
                <tr key={r.request_id}>
                  <td className="mono">
                    {r.request_id}
                    <Timeline entries={r.timeline} />
                  </td>
                  <td>{r.program.name}</td>
                  <td>{r.office}</td>
                  <td>
                    <div className="cell-sub">
                      {r.checklist.filter((c) => c.provided).length}/{r.checklist.length} provided
                    </div>
                  </td>
                  <td>
                    {r.claim_schedule ? (
                      <>
                        {r.claim_schedule}
                        <div className="cell-sub">{r.claim_location ?? ''}</div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                  <td>
                    {ops.pending?.id === r.request_id && (
                      <TransitionBar
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
                    {(ASSISTANCE_TRANSITIONS[r.status] ?? []).map((to) => (
                      <button
                        key={to}
                        type="button"
                        className="action-btn"
                        onClick={() => ops.setPending({ id: r.request_id, to })}
                      >
                        {actionLabel(to)}
                      </button>
                    ))}
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

export function Operations() {
  const { tenant } = useSession();
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Operations</h2>
          <p className="page-sub">Work the queues: 311 reports, eGov applications, assistance.</p>
        </div>
      </div>
      <ReportsTable tenantId={tenant.id} />
      <ApplicationsTable tenantId={tenant.id} />
      <AssistanceTable tenantId={tenant.id} />
    </div>
  );
}
