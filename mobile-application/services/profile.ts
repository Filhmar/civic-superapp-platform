import { api } from "@/services/api";
import type { User } from "@/types/auth";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function getProfile(): Promise<User> {
  const body = await api.get<Envelope<User>>("/v1/profile");
  return body.data;
}

export interface UpdateProfileInput {
  name?: string;
  /** Must be one of config.geo.units. */
  unit?: string;
  language?: string;
  avatar_url?: string;
}

export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  const body = await api.patch<Envelope<User>>("/v1/profile", input);
  return body.data;
}
