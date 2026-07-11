import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { AdminApi, errorMessage, resolveAssetUrl } from '../lib/api';
import type { AssetContentType } from '../lib/types';

const ALLOWED_TYPES: AssetContentType[] = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

interface Props {
  tenantId: string;
  label: string;
  value?: string;
  onUploaded: (url: string) => void;
}

/** Shared upload widget: presign -> PUT bytes -> confirm -> returns public URL. */
export default function AssetUpload({ tenantId, label, value, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbBroken, setThumbBroken] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setThumbBroken(false);
  }, [value]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type as AssetContentType)) {
      setError('Unsupported file type — use PNG, JPEG, WebP or SVG');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const presign = await AdminApi.presignAsset({
        content_type: file.type as AssetContentType,
        kind: 'brand',
        tenant_id: tenantId,
      });
      if (file.size > presign.max_bytes) {
        throw new Error(`File is too large (max ${(presign.max_bytes / (1024 * 1024)).toFixed(0)} MB)`);
      }
      const put = await fetch(presign.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!put.ok) throw new Error(`Upload failed (HTTP ${put.status})`);
      const confirmed = await AdminApi.confirmAsset(presign.media_id, tenantId);
      onUploaded(confirmed.url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="field">
      <div className="upload-zone">
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={(e) => void onFile(e)}
          disabled={uploading}
          aria-label={`Upload ${label}`}
        />
        {value && !thumbBroken ? (
          <img
            className="upload-thumb"
            src={resolveAssetUrl(value)}
            alt={label}
            onError={() => setThumbBroken(true)}
          />
        ) : (
          <span className="upload-ghost" aria-hidden />
        )}
        <span className="upload-label">{label}</span>
        <span className="upload-hint">
          {uploading ? 'Uploading…' : value ? 'Click to replace' : 'SVG / PNG / JPEG / WebP'}
        </span>
      </div>
      {error && <span className="helper-text" style={{ color: '#C0392B', marginTop: 6 }}>{error}</span>}
    </div>
  );
}
