/**
 * Media upload: presign → PUT raw bytes to the presigned URL → confirm.
 * The PUT goes straight to object storage with a bare axios call — it must
 * NOT pass through apiClient (no X-Tenant-ID / Authorization headers there).
 */
import axios from "axios";

import { api } from "@/services/api";
import type { MediaConfirmResponse, MediaKind, PresignResponse } from "@/types/media";

interface Envelope<T> {
  success: boolean;
  data: T;
}

export async function presignUpload(params: {
  contentType: string;
  kind: MediaKind;
}): Promise<PresignResponse> {
  const body = await api.post<Envelope<PresignResponse>>("/v1/media/presign", {
    content_type: params.contentType,
    kind: params.kind,
  });
  return body.data;
}

export async function confirmUpload(
  mediaId: string,
): Promise<MediaConfirmResponse> {
  const body = await api.post<Envelope<MediaConfirmResponse>>(
    `/v1/media/${mediaId}/confirm`,
  );
  return body.data;
}

/**
 * Full pipeline for a local file URI. `onProgress` receives 0..1.
 * Returns the public URL of the confirmed media.
 */
export async function uploadMedia(params: {
  uri: string;
  contentType: string;
  kind: MediaKind;
  onProgress?: (fraction: number) => void;
}): Promise<string> {
  const { uri, contentType, kind, onProgress } = params;
  const presign = await presignUpload({ contentType, kind });

  // Read the local file as a Blob (works for file:// and content:// URIs).
  const blob = await (await fetch(uri)).blob();
  if (blob.size > presign.max_bytes) {
    throw { status: 413, message: "File is too large." };
  }

  await axios.put(presign.upload_url, blob, {
    headers: { "Content-Type": contentType },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(e.loaded / e.total);
    },
  });

  const confirmed = await confirmUpload(presign.media_id);
  onProgress?.(1);
  return confirmed.url;
}
