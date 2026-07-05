import { api } from "@/services/api";
import type { AssistanceProgram, AssistanceRequest } from "@/types/assistance";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getAssistancePrograms(): Promise<AssistanceProgram[]> {
  const body = await api.get<Envelope<AssistanceProgram[]>>(
    "/v1/assistance/programs",
  );
  return body.data;
}

export async function createAssistanceRequest(input: {
  program_key: string;
  details: string;
}): Promise<AssistanceRequest> {
  const body = await api.post<Envelope<AssistanceRequest>>(
    "/v1/assistance/requests",
    input,
  );
  return body.data;
}

export async function getMyAssistanceRequests(): Promise<AssistanceRequest[]> {
  const body = await api.get<Envelope<AssistanceRequest[]>>(
    "/v1/assistance/requests",
  );
  return body.data;
}

export async function getAssistanceRequest(
  requestId: string,
): Promise<AssistanceRequest> {
  const body = await api.get<Envelope<AssistanceRequest>>(
    `/v1/assistance/requests/${requestId}`,
  );
  return body.data;
}
