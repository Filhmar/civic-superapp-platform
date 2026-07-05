export interface SosSession {
  session_id: string;
  status: "OPEN" | "CLOSED" | (string & {});
  dispatch_target: string;
  opened_at: string;
  closed_at: string | null;
  last_location: { lat: number; lng: number; at: string } | null;
  location_count: number;
}
