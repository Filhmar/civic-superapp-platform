export interface ReportCategory {
  key: string;
  label: string;
  /** lucide icon name in kebab-case, e.g. "trash-2". */
  icon: string;
  department: string;
}

export type ReportStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "RESOLVED"
  | "REJECTED"
  | (string & {});

export interface TimelineEntry {
  from: string | null;
  to: string;
  actor: string;
  at: string;
  note: string | null;
}

export interface Report {
  ticket_id: string;
  category: { key: string; label: string };
  department: string;
  description: string;
  photos: string[];
  geo: { lat: number; lng: number };
  address: string | null;
  status: ReportStatus;
  timeline: TimelineEntry[];
  created_at: string;
}

export interface CreateReportInput {
  category_key: string;
  description: string;
  photos?: string[];
  geo: { lat: number; lng: number };
  address?: string;
}
