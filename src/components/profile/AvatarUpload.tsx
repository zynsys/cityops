'use client';

import { useRef, useState } from 'react';
import { Camera, X, AlertCircle, Loader2 } from 'lucide-react';

interface AvatarUploadProps {
  initialAvatarUrl: string | null;
  displayName: string;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2);
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted text-lg font-semibold uppercase text-foreground">
      {initials}
    </span>
  );
}

export default function AvatarUpload({ initialAvatarUrl, displayName }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side size check
    if (file.size > 2 * 1024 * 1024) {
      setError('File must be 2 MB or smaller.');
      e.target.value = '';
      return;
    }

    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.append('avatar', file);

    try {
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.details?.[0] ?? 'Upload failed. Please try again.');
        return;
      }
      setAvatarUrl(json.avatarUrl as string);
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
      if (!res.ok) {
        setError('Failed to remove photo. Please try again.');
        return;
      }
      setAvatarUrl(null);
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-16 w-16 rounded-full border border-border object-cover"
            />
          ) : (
            <Initials name={displayName} />
          )}
          {uploading && (
            <span
              role="status"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-background/85 text-accent"
            >
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              <span className="sr-only">Updating photo…</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary px-3.5"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Upload
          </button>
          {avatarUrl && (
            <button type="button" onClick={handleRemove} disabled={uploading} className="btn-secondary px-3.5">
              <X className="h-4 w-4" aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm leading-relaxed text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}
