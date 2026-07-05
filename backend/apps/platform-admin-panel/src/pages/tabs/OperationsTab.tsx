import { useCallback, useEffect, useState } from 'react';
import { AdminApi, errorMessage } from '../../lib/api';
import type { AssistanceRequest, EgovApplication, ReportTicket } from '../../lib/types';
import StatusChip from '../../components/StatusChip';
import { useToast } from '../../components/Toast';

const REPORT_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
const REPORT_NEXT: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['RESOLVED', 'REJECTED'],
};

const APPLICATION_STATUSES = ['PENDING_PAYMENT', 'PROCESSING', 'READY', 'CLAIMED'];
const APPLICATION_NEXT: Record<string, string[]> = {
  PROCESSING: ['READY'],
  READY: ['CLAIMED'],
};

const ASSISTANCE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'DENIED'];
const ASSISTANCE_NEXT: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'DENIED'],
  UNDER_REVIEW: ['APPROVED', 'DENIED'],
};

function fmt(ts?: string | null): string {
  return ts ? new Date(ts).toLocaleString() : '—';
}

function FilterChips({
  statuses,
  value,
  onChange,
}: {
  statuses: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="filter-chips">
      <button className={value === '' ? 'filter-chip active' : 'filter-chip'} onClick={() => onChange('')}>
        All
      </button>
      {statuses.map((s) => (
        <button key={s} className={value === s ? 'filter-chip active' : 'filter-chip'} onClick={() => onChange(s)}>
          {s.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  );
}

function TransitionButtons({
  status,
  nextMap,
  onTransition,
}: {
  status: string;
  nextMap: Record<string, string[]>;
  onTransition: (to: string) => void;
}) {
  const nexts = nextMap[status] ?? [];
  if (nexts.length === 0) return <span className="muted">—</span>;
  return (
    <div className="action-row">
      {nexts.map((to) => (
        <button key={to} className="btn btn-sm btn-outline" onClick={() => onTransition(to)}>
          → {to.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  );
}

/** Prompt for an optional note; returns undefined for empty, null if the admin cancelled. */
function promptNote(to: string): string | undefined | null {
  const note = window.prompt(`Optional note for transition to ${to.replace(/_/g, ' ')}:`, '');
  if (note === null) return null;
  return note.trim() ? note.trim() : undefined;
}

function ReportsSection({ tenantId }: { tenantId: string }) {
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<ReportTicket[] | null>(null);

  const load = useCallback(() => {
    setItems(null);
    AdminApi.reports(tenantId, filter || undefined)
      .then(setItems)
      .catch((err) => {
        setItems([]);
        toast.push(errorMessage(err), 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, filter]);

  useEffect(load, [load]);

  const transition = async (ticketId: string, to: string) => {
    const note = promptNote(to);
    if (note === null) return;
    try {
      await AdminApi.reportTransition(tenantId, ticketId, { to, ...(note ? { note } : {}) });
      toast.push(`${ticketId} → ${to.replace(/_/g, ' ')}`);
      load();
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <h3 className="card-title">Reports (311)</h3>
        <FilterChips statuses={REPORT_STATUSES} value={filter} onChange={setFilter} />
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Category</th>
              <th>Department</th>
              <th>Description</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!items ? (
              <tr>
                <td colSpan={7} className="empty">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">
                  No reports{filter ? ` with status ${filter}` : ''}.
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={r.ticket_id}>
                  <td className="mono">{r.ticket_id}</td>
                  <td>{r.category?.label ?? r.category?.key}</td>
                  <td>{r.department}</td>
                  <td className="cell-clip" title={r.description}>
                    {r.description}
                  </td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                  <td className="muted">{fmt(r.created_at)}</td>
                  <td>
                    <TransitionButtons
                      status={r.status}
                      nextMap={REPORT_NEXT}
                      onTransition={(to) => void transition(r.ticket_id, to)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ApplicationsSection({ tenantId }: { tenantId: string }) {
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<EgovApplication[] | null>(null);

  const load = useCallback(() => {
    setItems(null);
    AdminApi.applications(tenantId, filter || undefined)
      .then(setItems)
      .catch((err) => {
        setItems([]);
        toast.push(errorMessage(err), 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, filter]);

  useEffect(load, [load]);

  const transition = async (stubId: string, to: string) => {
    const note = promptNote(to);
    if (note === null) return;
    try {
      await AdminApi.applicationTransition(tenantId, stubId, { to, ...(note ? { note } : {}) });
      toast.push(`${stubId} → ${to.replace(/_/g, ' ')}`);
      load();
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <h3 className="card-title">eGov applications</h3>
        <FilterChips statuses={APPLICATION_STATUSES} value={filter} onChange={setFilter} />
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Stub</th>
              <th>Service</th>
              <th>Group</th>
              <th>Total fees</th>
              <th>Window</th>
              <th>Ready ETA</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!items ? (
              <tr>
                <td colSpan={8} className="empty">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  No applications{filter ? ` with status ${filter}` : ''}.
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr key={a.stub_id}>
                  <td className="mono">{a.stub_id}</td>
                  <td>{a.service?.name}</td>
                  <td>{a.service?.group}</td>
                  <td>{a.fees ? a.fees.total.toLocaleString() : '—'}</td>
                  <td>{a.window_no ?? '—'}</td>
                  <td className="muted">{fmt(a.ready_eta)}</td>
                  <td>
                    <StatusChip status={a.status} />
                  </td>
                  <td>
                    <TransitionButtons
                      status={a.status}
                      nextMap={APPLICATION_NEXT}
                      onTransition={(to) => void transition(a.stub_id, to)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AssistanceSection({ tenantId }: { tenantId: string }) {
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<AssistanceRequest[] | null>(null);

  const load = useCallback(() => {
    setItems(null);
    AdminApi.assistance(tenantId, filter || undefined)
      .then(setItems)
      .catch((err) => {
        setItems([]);
        toast.push(errorMessage(err), 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, filter]);

  useEffect(load, [load]);

  const transition = async (requestId: string, to: string) => {
    const body: { to: string; note?: string; claim_schedule?: string; claim_location?: string } = { to };
    if (to === 'APPROVED') {
      const schedule = window.prompt('Claim schedule (YYYY-MM-DD):', '');
      if (!schedule) return;
      const location = window.prompt('Claim location:', '');
      if (!location) return;
      body.claim_schedule = schedule.trim();
      body.claim_location = location.trim();
    }
    const note = promptNote(to);
    if (note === null) return;
    if (note) body.note = note;
    try {
      await AdminApi.assistanceTransition(tenantId, requestId, body);
      toast.push(`${requestId} → ${to.replace(/_/g, ' ')}`);
      load();
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <h3 className="card-title">Assistance requests</h3>
        <FilterChips statuses={ASSISTANCE_STATUSES} value={filter} onChange={setFilter} />
      </div>
      <div className="table-scroll">
        <table className="table">
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
            {!items ? (
              <tr>
                <td colSpan={7} className="empty">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">
                  No assistance requests{filter ? ` with status ${filter}` : ''}.
                </td>
              </tr>
            ) : (
              items.map((a) => {
                const provided = a.checklist?.filter((c) => c.provided).length ?? 0;
                return (
                  <tr key={a.request_id}>
                    <td className="mono">{a.request_id}</td>
                    <td>{a.program?.name}</td>
                    <td>{a.office}</td>
                    <td>
                      {provided}/{a.checklist?.length ?? 0} provided
                    </td>
                    <td className="muted">
                      {a.claim_schedule ? `${a.claim_schedule} · ${a.claim_location ?? ''}` : '—'}
                    </td>
                    <td>
                      <StatusChip status={a.status} />
                    </td>
                    <td>
                      <TransitionButtons
                        status={a.status}
                        nextMap={ASSISTANCE_NEXT}
                        onTransition={(to) => void transition(a.request_id, to)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function OperationsTab({ tenantId }: { tenantId: string }) {
  return (
    <div className="stack">
      <ReportsSection tenantId={tenantId} />
      <ApplicationsSection tenantId={tenantId} />
      <AssistanceSection tenantId={tenantId} />
    </div>
  );
}
