/** Redacts a phone for logs: keeps the +63 prefix and last 4 digits. */
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return '••••';
  return `${phone.slice(0, 3)}••••••${phone.slice(-4)}`;
}
