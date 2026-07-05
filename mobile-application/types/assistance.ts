import type { TimelineEntry } from "@/types/reports";

export interface AssistanceProgram {
  key: string;
  name: string;
  description: string;
  /** lucide icon name in kebab-case. */
  icon: string;
  office: string;
  requirements: string[];
}

export interface ChecklistItem {
  name: string;
  provided: boolean;
}

export type AssistanceStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "RELEASED"
  | "REJECTED"
  | (string & {});

export interface AssistanceRequest {
  request_id: string;
  program: { key: string; name: string };
  office: string;
  details: string;
  checklist: ChecklistItem[];
  status: AssistanceStatus;
  claim_schedule: string | null;
  claim_location: string | null;
  timeline: TimelineEntry[];
  created_at: string;
}
