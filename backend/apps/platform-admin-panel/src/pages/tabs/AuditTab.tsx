import { useEffect, useState } from 'react';
import { AdminApi, errorMessage } from '../../lib/api';
import type { AuditItem } from '../../lib/types';
import { AUDIT_ICONS, Icon } from '../../components/Icons';
import { useToast } from '../../components/Toast';

const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  ADVISORY: { bg: '#FDECEC', fg: '#C0392B' },
  EVENT: { bg: '#FEF3E0', fg: '#B7791F' },
  PROGRAM: { bg: '#F0EBFB', fg: '#6D4BC7' },
  GOVERNANCE: { bg: '#E8EEFB', fg: '#2A5BD7' },
  TOURISM: { bg: '#E6F5EC', fg: '#1E8449' },
  JOBS: { bg: '#E8F5F0', fg: '#1B7F6B' },
  REPORTS: { bg: '#FEF3E0', fg: '#B7791F' },
  EGOV: { bg: '#E8EEFB', fg: '#2A5BD7' },
  ASSIST: { bg: '#E6F5EC', fg: '#1E8449' },
  CONTENT: { bg: '#F0EBFB', fg: '#6D4BC7' },
  CONFIG: { bg: '#EEF0FE', fg: '#5B5BD6' },
};

const FALLBACK = { bg: '#EEF0FE', fg: '#5B5BD6' };

function fmt(ts: string): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    <div>
      {categories.length > 0 && (
        <div className="filter-chips" style={{ marginBottom: 16 }}>
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
      )}
      <div className="audit-card">
        {!items ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">No audit entries{filter ? ` for ${filter}` : ''}.</div>
        ) : (
          items.map((a) => {
            const cat = a.category.toUpperCase();
            const colors = CATEGORY_COLORS[cat] ?? FALLBACK;
            return (
              <div key={a.id} className="audit-row">
                <span className="audit-icon" style={{ background: colors.bg, color: colors.fg }}>
                  <Icon name={AUDIT_ICONS[cat] ?? 'tag'} />
                </span>
                <span className="cat-chip" style={{ background: colors.bg, color: colors.fg }}>
                  {a.category}
                </span>
                <span className="audit-title cell-clip" title={a.title}>
                  {a.title}
                </span>
                <span className="audit-actor cell-clip" title={a.user_id ?? ''}>
                  {a.user_id ? `${a.user_id.slice(0, 8)}…` : '—'}
                </span>
                <span className="audit-time">{fmt(a.at)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
