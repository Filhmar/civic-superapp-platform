const CHIP_CLASS: Record<string, string> = {
  SUBMITTED: 'chip-gray',
  UNDER_REVIEW: 'chip-amber',
  PROCESSING: 'chip-amber',
  RESOLVED: 'chip-green',
  APPROVED: 'chip-green',
  READY: 'chip-green',
  CLAIMED: 'chip-green',
  REJECTED: 'chip-red',
  DENIED: 'chip-red',
  PENDING_PAYMENT: 'chip-blue',
};

export function StatusChip({ status }: { status: string }) {
  const cls = CHIP_CLASS[status.toUpperCase()] ?? 'chip-gray';
  return <span className={`chip ${cls}`}>{status.replace(/_/g, ' ')}</span>;
}
