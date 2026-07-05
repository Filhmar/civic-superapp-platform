export interface DigitalId {
  resident_id: string;
  name: string | null;
  unit: string | null;
  verified_resident: boolean;
  valid_until: string;
  qr_token: string;
  qr_expires_in: number;
}
