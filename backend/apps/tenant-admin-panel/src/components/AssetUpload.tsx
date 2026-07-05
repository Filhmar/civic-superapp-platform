import { useRef, useState } from 'react';
import { ApiError, uploadAsset, UPLOAD_CONTENT_TYPES } from '../lib/api';
import { useToast } from './Toasts';

interface AssetUploadProps {
  label: string;
  value: string;
  tenantId: string;
  onChange: (url: string) => void;
}

/** file input -> presign -> PUT bytes -> confirm -> onChange(public url) */
export function AssetUpload({ label, value, tenantId, onChange }: AssetUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadAsset(file, tenantId);
      onChange(url);
      toast('success', `${label} uploaded`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Upload failed';
      setError(msg);
      toast('error', msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="asset-upload">
      <span className="field-label">{label}</span>
      <div className="asset-upload-row">
        <div className="asset-thumb">
          {value ? (
            <img src={value} alt={label} />
          ) : (
            <span className="asset-thumb-empty">none</span>
          )}
        </div>
        <div className="asset-upload-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={UPLOAD_CONTENT_TYPES.join(',')}
            style={{ display: 'none' }}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          {error && <span className="field-error">{error}</span>}
        </div>
      </div>
    </div>
  );
}
