import { api } from "@/services/api";
import type {
  CreateReportInput,
  Report,
  ReportCategory,
} from "@/types/reports";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getReportCategories(): Promise<ReportCategory[]> {
  const body = await api.get<Envelope<ReportCategory[]>>(
    "/v1/reports/categories",
  );
  return body.data;
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  const body = await api.post<Envelope<Report>>("/v1/reports", input);
  return body.data;
}

export async function getMyReports(): Promise<Report[]> {
  const body = await api.get<Envelope<Report[]>>("/v1/reports");
  return body.data;
}

export async function getReport(ticketId: string): Promise<Report> {
  const body = await api.get<Envelope<Report>>(`/v1/reports/${ticketId}`);
  return body.data;
}
