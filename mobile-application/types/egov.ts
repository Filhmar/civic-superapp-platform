import type { TimelineEntry } from "@/types/reports";

export interface ServiceItem {
  code: string;
  name: string;
  description: string;
  fee: number;
  requirements: string[];
  processing_days: number;
}

export interface ServiceGroup {
  group: string;
  services: ServiceItem[];
}

export type ApplicationStatus =
  | "PENDING_PAYMENT"
  | "PROCESSING"
  | "READY"
  | "CLAIMED"
  | (string & {});

export interface ApplicationFees {
  fee: number;
  convenience_fee: number;
  total: number;
}

export interface Application {
  application_id: string;
  stub_id: string;
  service: { code: string; name: string; group: string };
  status: ApplicationStatus;
  form_data: Record<string, string>;
  fees: ApplicationFees;
  window_no: string | null;
  ready_eta: string | null;
  timeline: TimelineEntry[];
  qr_payload: string;
  created_at: string;
}

export interface CreateApplicationInput {
  service_code: string;
  form_data: Record<string, string>;
}

export type PaymentMethod = "gcash" | "card";

export interface Payment {
  payment_id: string;
  method: PaymentMethod;
  amount: number;
  status: string;
  receipt_no: string;
  created_at: string;
}

export interface PaymentResult {
  payment: Payment;
  application: Application;
  idempotent_replay?: boolean;
}
