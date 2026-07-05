import { claimStubId, residentId, ticketId } from './tenant-ids';

describe('tenant-prefixed ids (Reference §5)', () => {
  it('formats ticket ids as {PREFIX}-######', () => {
    expect(ticketId('DSM', 7)).toBe('DSM-000007');
    expect(ticketId('SOR', 123456)).toBe('SOR-123456');
  });

  it('formats resident ids as {PREFIX}-{year}-{seq}', () => {
    expect(residentId('DSM', 2026, 42)).toBe('DSM-2026-000042');
    expect(residentId('SOR', 2026, 1)).toBe('SOR-2026-000001');
  });

  it('formats claim stubs as {PREFIX}-{svc}-{seq}', () => {
    expect(claimStubId('DSM', 'brgy', 3)).toBe('DSM-BRGY-000003');
    expect(claimStubId('SOR', 'CTC', 10)).toBe('SOR-CTC-000010');
  });
});
