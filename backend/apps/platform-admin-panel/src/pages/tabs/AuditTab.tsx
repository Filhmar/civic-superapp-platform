import { useEffect, useState } from 'react';
import { AdminApi, errorMessage } from '../../lib/api';
import type { AuditItem } from '../../lib/types';
import { useToast } from '../../components/Toast';

function fmt(ts: string): string {
  return new Date(ts).toLocaleString();
}

export default function AuditTab({ tenantId }: { tenantId: string }) {
  const toast = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<AuditItem[] | null>(null);

  // Full feed once, to derive category chips.
  useEffect(() => {
    let cancelled = false;
    AdminApi.audit(tenantId)
      .then((all) => {
        if (cancelled) return;
        setCategories(Array.from(new Set(all.map((a) => a.category))).sort());
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    AdminApi.audit(tenantId, filter || undefined)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([]);
          toast.push(errorMessage(err), 'error');
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, filter]);

  return (
    <section className="card">
      <div className="card-head">
        <h3 className="card-title">Audit feed</h3>
        <div className="filter-chips">
          <button className={filter === '' ? 'filter-chip active' : 'filter-chip'} onClick={() => setFilter('')}>
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={filter === c ? 'filter-chip active' : 'filter-chip'}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Event</th>
              <th>User</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {!items ? (
              <tr>
                <td colSpan={4} className="empty">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty">
                  No audit entries{filter ? ` for ${filter}` : ''}.
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="chip chip-blue">{a.category}</span>
                  </td>
                  <td>{a.title}</td>
                  <td className="mono cell-clip" title={a.user_id ?? ''}>
                    {a.user_id ?? '—'}
                  </td>
                  <td className="muted">{fmt(a.at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
