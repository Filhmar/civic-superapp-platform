import { api } from "@/services/api";
import type { SosSession } from "@/types/sos";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function openSosSession(geo: {
  lat: number;
  lng: number;
}): Promise<SosSession> {
  const body = await api.post<Envelope<SosSession>>("/v1/sos/sessions", geo);
  return body.data;
}

export async function postSosLocation(
  sessionId: string,
  geo: { lat: number; lng: number },
): Promise<void> {
  await api.post(`/v1/sos/sessions/${sessionId}/location`, geo);
}

export async function closeSosSession(sessionId: string): Promise<SosSession> {
  const body = await api.post<Envelope<SosSession>>(
    `/v1/sos/sessions/${sessionId}/close`,
  );
  return body.data;
}
