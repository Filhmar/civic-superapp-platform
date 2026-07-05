import { api } from "@/services/api";
import type { Hotline } from "@/types/hotlines";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getHotlines(tag?: string): Promise<Hotline[]> {
  const body = await api.get<Envelope<Hotline[]>>("/v1/hotlines", {
    params: tag ? { tag } : undefined,
  });
  return body.data;
}
