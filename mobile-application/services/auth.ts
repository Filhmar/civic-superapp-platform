/**
 * Auth service — OTP-first login, guest sessions, refresh, logout.
 * `refreshToken` uses `apiClient` directly because token-refresh must inspect
 * the raw status code to distinguish dead sessions (401/403) from transient
 * failures.
 */
import { api, apiClient } from "@/services/api";
import type {
  GuestLoginResponse,
  OtpRequestResponse,
  OtpVerifyResponse,
  RefreshResponse,
} from "@/types/auth";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResult {
  status: number;
  data: RefreshTokenResponse | null;
}

export async function refreshToken(params: {
  refreshToken: string;
}): Promise<RefreshResult> {
  const response = await apiClient.post("/v1/auth/refresh", {
    refresh_token: params.refreshToken,
  });
  const body = response.data as Envelope<RefreshResponse> | undefined;
  const pair = body?.data;
  return {
    status: response.status,
    data:
      pair?.access_token != null
        ? { accessToken: pair.access_token, refreshToken: pair.refresh_token }
        : null,
  };
}

export async function requestOtp(
  phoneNumber: string,
): Promise<OtpRequestResponse> {
  const body = await api.post<Envelope<OtpRequestResponse>>("/v1/otp/request", {
    phone_number: phoneNumber,
  });
  return body.data;
}

export async function verifyOtp(params: {
  phoneNumber: string;
  code: string;
}): Promise<OtpVerifyResponse> {
  const body = await api.post<Envelope<OtpVerifyResponse>>("/v1/otp/verify", {
    phone_number: params.phoneNumber,
    code: params.code,
  });
  return body.data;
}

export async function guestLogin(): Promise<GuestLoginResponse> {
  const body = await api.post<Envelope<GuestLoginResponse>>("/v1/auth/guest");
  return body.data;
}

export async function logout(): Promise<void> {
  // Best-effort — a dead session must never block local sign-out.
  try {
    await api.post("/v1/auth/logout");
  } catch {
    // ignore
  }
}
