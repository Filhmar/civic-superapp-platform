import { api } from "@/services/api";
import type { TransportRoute } from "@/types/transport";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getTransportRoutes(): Promise<TransportRoute[]> {
  const body = await api.get<Envelope<TransportRoute[]>>("/v1/transport/routes");
  return body.data;
}

export async function matchTransportRoutes(
  from: string,
  to: string,
): Promise<TransportRoute[]> {
  const body = await api.get<Envelope<TransportRoute[]>>("/v1/transport/match", {
    params: { from, to },
  });
  return body.data;
}
