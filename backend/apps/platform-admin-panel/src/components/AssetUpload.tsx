import { useRef, useState } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className="asset-upload">
      <span className="field-label">{label}</span>
      <div className="asset-row">
        {value ? (
          <img className="asset-thumb" src={resolveAssetUrl(value)} alt={label} />
        ) : (
          <div className="asset-thumb asset-thumb-empty">none</div>
        )}
        <div className="asset-controls">
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            onChange={(e) => void onFile(e)}
            disabled={uploading}
          />
          {uploading && <span className="muted">Uploading…</span>}
          {error && <span className="form-error">{error}</span>}
        </div>
      </div>
    </div>
  );
}
