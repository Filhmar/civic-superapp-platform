import { api } from "@/services/api";
import type { Weather } from "@/types/weather";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getWeather(): Promise<Weather> {
  const body = await api.get<Envelope<Weather>>("/v1/weather");
  return body.data;
}
