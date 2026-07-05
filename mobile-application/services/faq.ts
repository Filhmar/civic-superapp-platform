import { api } from "@/services/api";
import type { FaqItem } from "@/types/faq";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getFaq(locale: string): Promise<FaqItem[]> {
  const body = await api.get<Envelope<FaqItem[]>>("/v1/faq", {
    params: { locale },
  });
  return body.data;
}
