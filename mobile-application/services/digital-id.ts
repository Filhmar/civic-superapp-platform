import { api } from "@/services/api";
import type { DigitalId } from "@/types/digital-id";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getDigitalId(): Promise<DigitalId> {
  const body = await api.get<Envelope<DigitalId>>("/v1/digital-id");
  return body.data;
}
