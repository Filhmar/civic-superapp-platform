export interface PresignResponse {
  media_id: string;
  upload_url: string;
  key: string;
  max_bytes: number;
  expires_in: number;
}

export interface MediaConfirmResponse {
  url: string;
}

export type MediaKind = "report" | "avatar";
