import { useRef, useState } from 'react';
import { ApiError, uploadAsset, UPLOAD_CONTENT_TYPES } from '../lib/api';
import { Icon } from './Icons';
import { useToast } from './Toasts';

interface AssetUploadProps {
  label: string;
  value: string;
  tenantId: string;
  onChange: (url: string) => void;
  /** small hint under the label, e.g. "SVG / PNG · square" */
  hint?: string;
}

/** Designed upload zone: file input -> presign -> PUT bytes -> confirm -> onChange(url). */
export function AssetUpload({ label, value, tenantId, onChange, hint }: AssetUploadProps) {
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
    <>
      <button
        type="button"
        className="upload-zone"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <span className="upload-zone-icon" aria-hidden>
          {value ? <img src={value} alt="" /> : <Icon name="upload" />}
        </span>
        <span>
          <span className="upload-zone-label">{label}</span>
          <div className={`upload-zone-hint${error ? ' field-error' : ''}`}>
            {uploading
              ? 'Uploading…'
              : error ?? (value ? 'Uploaded · click to replace' : hint ?? 'PNG / JPEG / WebP / SVG')}
          </div>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_CONTENT_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </>
  );
}
