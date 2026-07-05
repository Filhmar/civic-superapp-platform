/**
 * Tenant-prefixed id generation (Reference §5): every generated id uses the
 * tenant prefix — tickets `{PREFIX}-######`, resident ids `{PREFIX}-{year}-{seq}`,
 * claim stubs `{PREFIX}-{svc}-{seq}`.
 */

export function ticketId(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

export function residentId(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(6, '0')}`;
}

export function claimStubId(prefix: string, serviceCode: string, seq: number): string {
  return `${prefix}-${serviceCode.toUpperCase()}-${String(seq).padStart(6, '0')}`;
}
