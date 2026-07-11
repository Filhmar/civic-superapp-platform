import { Icon } from './Icons';
import type { IconName } from './Icons';

/**
 * Category chip colors (design spec §1.4). GOVERNANCE and CONFIG (+ every
 * audit category outside the six post categories) are TENANT-DERIVED —
 * primary-soft/primary and accent-soft/accent-deep respectively.
 */
const NEUTRAL_CATS: Record<string, { bg: string; fg: string }> = {
  ADVISORY: { bg: '#FDECEC', fg: '#C0392B' },
  EVENT: { bg: '#FEF3E0', fg: '#B7791F' },
  PROGRAM: { bg: '#F0EBFB', fg: '#6D4BC7' },
  TOURISM: { bg: '#E6F5EC', fg: '#1E8449' },
  JOBS: { bg: '#E8F5F0', fg: '#1B7F6B' },
};

export function catColors(category: string): { bg: string; fg: string } {
  const c = category.toUpperCase();
  if (c === 'GOVERNANCE') return { bg: 'var(--primary-soft)', fg: 'var(--primary)' };
  const neutral = NEUTRAL_CATS[c];
  if (neutral) return neutral;
  // CONFIG + audit fallback (REPORTS / EGOV / ASSIST / CONTENT / …) — accent-tinted.
  return { bg: 'var(--accent-soft)', fg: 'var(--accent-deep)' };
}

export function catIcon(category: string): IconName {
  switch (category.toUpperCase()) {
    case 'REPORTS':
    case 'ADVISORY':
      return 'alert-triangle';
    case 'EGOV':
    case 'GOVERNANCE':
      return 'bank';
    case 'ASSIST':
    case 'ASSISTANCE':
      return 'heart';
    case 'CONTENT':
    case 'NEWS':
    case 'EVENT':
      return 'news';
    case 'TOURISM':
      return 'map-pin';
    case 'JOBS':
      return 'briefcase';
    case 'CONFIG':
    default:
      return 'brush';
  }
}

export function CatChip({ category }: { category: string }) {
  const { bg, fg } = catColors(category);
  return (
    <span className="cat-chip" style={{ background: bg, color: fg }}>
      {category}
    </span>
  );
}

/** 34px category icon tile (audit rows). */
export function CatTile({ category }: { category: string }) {
  const { bg, fg } = catColors(category);
  return (
    <span className="cat-tile" style={{ background: bg, color: fg }} aria-hidden>
      <Icon name={catIcon(category)} />
    </span>
  );
}

const p2 = (n: number) => String(n).padStart(2, '0');

/** "07-06 12:17" — dashboard activity timestamps. */
export function fmtShort(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return `${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** "2026-07-06 12:58" — audit trail timestamps. */
export function fmtAudit(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Version-history mini-rows: today → "12:18", otherwise "Jul 5". */
export function fmtVersion(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
