export type AuthScope = "guest" | "resident";

/** 'anonymous' = no session at all (pre-login). */
export type AuthStatus = "anonymous" | AuthScope;

export interface User {
  id: string;
  phone_number: string;
  name: string | null;
  unit: string | null;
  language: string;
  avatar_url: string | null;
  resident_id: string;
  verified_resident: boolean;
}

export interface OtpRequestResponse {
  requested: boolean;
  expires_in_seconds: number;
  /** Present in dev environments only. */
  dev_code?: string;
}

export interface OtpVerifyResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: "resident";
  user: User;
}

export interface GuestLoginResponse {
  access_token: string;
  /** Guests get no refresh token. */
  refresh_token: string;
  expires_in: number;
  scope: "guest";
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
