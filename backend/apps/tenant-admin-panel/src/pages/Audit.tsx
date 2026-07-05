import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useSession } from '../components/AuthLayout';
import { useToast } from '../components/Toasts';
import type { AuditEvent } from '../lib/types';

export function Audit() {
  const { tenant } = useSession();
  const toast = useToast();
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');

  useEffect(() => {
    let cancelled = false;
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    setEvents(null);
    void api<AuditEvent[]>(`/admin/tenants/${tenant.id}/audit${qs}`)
      .then((data) => {
        if (cancelled) return;
        setEvents(data);
        if (!category) {
          setCategories([...new Set(data.map((e) => e.category))].sort());
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          toast('error', err instanceof ApiError ? err.message : 'Failed to load audit log');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tenant.id, category, toast]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Audit log</h2>
          <p className="page-sub">Every state change recorded for this city.</p>
        </div>
        <select
          className="status-filter"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <section className="panel">
        {events === null ? (
          <div className="loading">Loading…</div>
        ) : events.length === 0 ? (
          <p className="empty">No audit events.</p>
        ) : (
          <ul className="audit-list">
            {events.map((ev) => (
              <li key={ev.id} className="audit-row">
                <span className="chip chip-gray audit-cat">{ev.category}</span>
                <span className="audit-title">
                  {ev.title}
                  {ev.user_id && <span className="cell-sub"> user {ev.user_id.slice(0, 8)}…</span>}
                </span>
                <span className="audit-time">{new Date(ev.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
