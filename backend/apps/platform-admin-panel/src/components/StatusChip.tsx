const GREEN = new Set(['RESOLVED', 'APPROVED', 'READY', 'CLAIMED', 'active']);
const RED = new Set(['REJECTED', 'DENIED', 'suspended', 'inactive']);
const AMBER = new Set(['UNDER_REVIEW', 'PROCESSING']);
const BLUE = new Set(['PENDING_PAYMENT']);

export function chipTone(status: string): string {
  if (GREEN.has(status)) return 'green';
  if (RED.has(status)) return 'red';
  if (AMBER.has(status)) return 'amber';
  if (BLUE.has(status)) return 'blue';
  return 'gray';
}

export default function StatusChip({ status }: { status: string }) {
  return <span className={`chip chip-${chipTone(status)}`}>{status.replace(/_/g, ' ')}</span>;
}
