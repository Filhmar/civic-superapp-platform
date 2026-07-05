/**
 * Auth service (M0: refresh endpoint only — M1 fills login/OTP).
 * Uses `apiClient` directly because token-refresh must inspect the raw status
 * code to distinguish dead sessions (401/403) from transient failures.
 */
import { apiClient } from "@/services/api";

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
  const response = await apiClient.post("/v1/auth/token/refresh", params);
  const body = response.data as
    | { success?: boolean; data?: RefreshTokenResponse }
    | RefreshTokenResponse
    | undefined;
  const data =
    body && "data" in (body as object)
      ? ((body as { data?: RefreshTokenResponse }).data ?? null)
      : ((body as RefreshTokenResponse | undefined) ?? null);
  return { status: response.status, data };
}
