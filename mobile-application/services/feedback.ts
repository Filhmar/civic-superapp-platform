import { api } from "@/services/api";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function sendFeedback(input: {
  message: string;
  contact?: string;
}): Promise<{ id: string; received: boolean }> {
  const body = await api.post<Envelope<{ id: string; received: boolean }>>(
    "/v1/feedback",
    input,
  );
  return body.data;
}
