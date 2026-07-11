import { useCallback, useEffect, useState } from 'react';
import { AdminApi, errorMessage } from '../../lib/api';
import type { AssistanceRequest, EgovApplication, ReportTicket } from '../../lib/types';
import StatusChip from '../../components/StatusChip';
import TransitionDialog, {
  actionColorFor,
  actionLabelFor,
  toneFor,
} from '../../components/TransitionDialog';
import type { TransitionRequest } from '../../components/TransitionDialog';
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

function fmtDate(ts?: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  onPick,
}: {
  status: string;
  nextMap: Record<string, string[]>;
  onPick: (to: string) => void;
}) {
  const nexts = nextMap[status] ?? [];
  if (nexts.length === 0) return <span className="closed-label">closed</span>;
  return (
    <span className="action-row">
      {nexts.map((to) => {
        const color = actionColorFor(to);
        return (
          <button
            key={to}
            className="action-btn"
            style={{
              background: `${color}1A`,
              color,
              border: `1px solid ${color}40`,
            }}
            data-transition={to}
            onClick={() => onPick(to)}
          >
            {actionLabelFor(to)}
          </button>
        );
      })}
    </span>
  );
}

interface Pending {
  id: string;
  to: string;
  request: TransitionRequest;
}

function usePendingTransition() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const open = (id: string, to: string, withClaimFields = false) =>
    setPending({
      id,
      to,
      request: {
        title: actionLabelFor(to),
        targetId: id,
        tone: toneFor(to),
        confirmLabel: actionLabelFor(to),
        withClaimFields,
      },
    });
  return { pending, setPending, busy, setBusy, open };
}

function ReportsSection({ tenantId }: { tenantId: string }) {
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<ReportTicket[] | null>(null);
  const { pending, setPending, busy, setBusy, open } = usePendingTransition();

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

  const confirm = async (values: { note?: string }) => {
    if (!pending) return;
    setBusy(true);
    try {
      await AdminApi.reportTransition(tenantId, pending.id, {
        to: pending.to,
        ...(values.note ? { note: values.note } : {}),
      });
      toast.push(`Status updated → ${pending.to.replace(/_/g, ' ')}`);
      setPending(null);
      load();
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="save-bar" style={{ marginBottom: 14 }}>
        <FilterChips statuses={REPORT_STATUSES} value={filter} onChange={setFilter} />
      </div>
      <div className="table-card">
        <div className="trow trow-head cols-ops">
          <span>Ticket</span>
          <span>Category</span>
          <span>Department</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Action</span>
        </div>
        {!items ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">No reports{filter ? ` with status ${filter.replace(/_/g, ' ')}` : ''}.</div>
        ) : (
          items.map((r) => (
            <div key={r.ticket_id} className="trow cols-ops">
              <span className="cell-mono-id">{r.ticket_id}</span>
              <span className="cell-clip" title={r.description}>
                {r.category?.label ?? r.category?.key}
              </span>
              <span className="cell-meta cell-clip">{r.department}</span>
              <span>
                <StatusChip status={r.status} />
              </span>
              <TransitionButtons
                status={r.status}
                nextMap={REPORT_NEXT}
                onPick={(to) => open(r.ticket_id, to)}
              />
            </div>
          ))
        )}
      </div>
      {pending && (
        <TransitionDialog
          request={pending.request}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={(v) => void confirm(v)}
        />
      )}
    </>
  );
}

function ApplicationsSection({ tenantId }: { tenantId: string }) {
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<EgovApplication[] | null>(null);
  const { pending, setPending, busy, setBusy, open } = usePendingTransition();

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

  const confirm = async (values: { note?: string }) => {
    if (!pending) return;
    setBusy(true);
    try {
      await AdminApi.applicationTransition(tenantId, pending.id, {
        to: pending.to,
        ...(values.note ? { note: values.note } : {}),
      });
      toast.push(`Status updated → ${pending.to.replace(/_/g, ' ')}`);
      setPending(null);
      load();
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="save-bar" style={{ marginBottom: 14 }}>
        <FilterChips statuses={APPLICATION_STATUSES} value={filter} onChange={setFilter} />
      </div>
      <div className="table-card">
        <div className="trow trow-head cols-apps">
          <span>Stub</span>
          <span>Service</span>
          <span>Fees</span>
          <span>Window</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Action</span>
        </div>
        {!items ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">No applications{filter ? ` with status ${filter.replace(/_/g, ' ')}` : ''}.</div>
        ) : (
          items.map((a) => (
            <div key={a.stub_id} className="trow cols-apps">
              <span className="cell-mono-id">{a.stub_id}</span>
              <span>
                <span className="cell-name" style={{ fontSize: 13 }}>
                  {a.service?.name}
                </span>
                <span className="cell-meta" style={{ display: 'block', fontSize: 11.5 }}>
                  {a.service?.group}
                </span>
              </span>
              <span className="cell-mono-id">{a.fees ? `₱${a.fees.total.toLocaleString()}` : '—'}</span>
              <span className="cell-meta">{a.window_no ?? '—'}</span>
              <span>
                <StatusChip status={a.status} />
              </span>
              <TransitionButtons
                status={a.status}
                nextMap={APPLICATION_NEXT}
                onPick={(to) => open(a.stub_id, to)}
              />
            </div>
          ))
        )}
      </div>
      {pending && (
        <TransitionDialog
          request={pending.request}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={(v) => void confirm(v)}
        />
      )}
    </>
  );
}

function AssistanceSection({ tenantId }: { tenantId: string }) {
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<AssistanceRequest[] | null>(null);
  const { pending, setPending, busy, setBusy, open } = usePendingTransition();

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

  const confirm = async (values: {
    note?: string;
    claim_schedule?: string;
    claim_location?: string;
  }) => {
    if (!pending) return;
    if (pending.to === 'APPROVED' && (!values.claim_schedule || !values.claim_location)) {
      toast.push('Claim date and location are required to approve', 'error');
      return;
    }
    setBusy(true);
    try {
      await AdminApi.assistanceTransition(tenantId, pending.id, {
        to: pending.to,
        ...(values.note ? { note: values.note } : {}),
        ...(values.claim_schedule ? { claim_schedule: values.claim_schedule } : {}),
        ...(values.claim_location ? { claim_location: values.claim_location } : {}),
      });
      toast.push(`Status updated → ${pending.to.replace(/_/g, ' ')}`);
      setPending(null);
      load();
    } catch (err) {
      toast.push(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="save-bar" style={{ marginBottom: 14 }}>
        <FilterChips statuses={ASSISTANCE_STATUSES} value={filter} onChange={setFilter} />
      </div>
      <div className="table-card">
        <div className="trow trow-head cols-assist">
          <span>Request</span>
          <span>Program</span>
          <span>Office</span>
          <span>Claim</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Action</span>
        </div>
        {!items ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">
            No assistance requests{filter ? ` with status ${filter.replace(/_/g, ' ')}` : ''}.
          </div>
        ) : (
          items.map((a) => {
            const provided = a.checklist?.filter((c) => c.provided).length ?? 0;
            return (
              <div key={a.request_id} className="trow cols-assist">
                <span className="cell-mono-id">{a.request_id}</span>
                <span>
                  <span className="cell-name" style={{ fontSize: 13 }}>
                    {a.program?.name}
                  </span>
                  <span className="cell-meta" style={{ display: 'block', fontSize: 11.5 }}>
                    {provided}/{a.checklist?.length ?? 0} requirements provided
                  </span>
                </span>
                <span className="cell-meta cell-clip">{a.office}</span>
                <span className="cell-mono-time">
                  {a.claim_schedule ? `${fmtDate(a.claim_schedule)} · ${a.claim_location ?? ''}` : '—'}
                </span>
                <span>
                  <StatusChip status={a.status} />
                </span>
                <TransitionButtons
                  status={a.status}
                  nextMap={ASSISTANCE_NEXT}
                  onPick={(to) => open(a.request_id, to, to === 'APPROVED')}
                />
              </div>
            );
          })
        )}
      </div>
      {pending && (
        <TransitionDialog
          request={pending.request}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={(v) => void confirm(v)}
        />
      )}
    </>
  );
}

const DOMAINS = [
  { key: 'reports', label: '311 Reports' },
  { key: 'apps', label: 'e-Gov Applications' },
  { key: 'assist', label: 'Assistance' },
] as const;

type DomainKey = (typeof DOMAINS)[number]['key'];

export default function OperationsTab({ tenantId }: { tenantId: string }) {
  const [domain, setDomain] = useState<DomainKey>('reports');
  const [counts, setCounts] = useState<Record<DomainKey, number | null>>({
    reports: null,
    apps: null,
    assist: null,
  });

  useEffect(() => {
    let cancelled = false;
    AdminApi.reports(tenantId)
      .then((r) => !cancelled && setCounts((c) => ({ ...c, reports: r.length })))
      .catch(() => undefined);
    AdminApi.applications(tenantId)
      .then((r) => !cancelled && setCounts((c) => ({ ...c, apps: r.length })))
      .catch(() => undefined);
    AdminApi.assistance(tenantId)
      .then((r) => !cancelled && setCounts((c) => ({ ...c, assist: r.length })))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return (
    <div>
      <div className="seg-row">
        {DOMAINS.map((d) => (
          <button
            key={d.key}
            className={domain === d.key ? 'seg-pill active' : 'seg-pill'}
            data-ops-domain={d.key}
            onClick={() => setDomain(d.key)}
          >
            {d.label}
            {counts[d.key] !== null && <span className="seg-count">{counts[d.key]}</span>}
          </button>
        ))}
      </div>
      <div className="tab-pane" key={domain}>
        {domain === 'reports' && <ReportsSection tenantId={tenantId} />}
        {domain === 'apps' && <ApplicationsSection tenantId={tenantId} />}
        {domain === 'assist' && <AssistanceSection tenantId={tenantId} />}
      </div>
    </div>
  );
}
