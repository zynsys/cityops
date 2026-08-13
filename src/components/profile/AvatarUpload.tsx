"use client";

import { useRef, useState } from "react";
import { Camera, X, AlertCircle } from "lucide-react";

interface AvatarUploadProps {
  initialAvatarUrl: string | null;
  displayName: string;
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : parts[0].slice(0, 2);
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-sm font-semibold uppercase text-accent-foreground">
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
      setError("File must be 2 MB or smaller.");
      e.target.value = "";
      return;
    }

    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);

    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.details?.[0] ?? "Upload failed. Please try again.");
        return;
      }
      setAvatarUrl(json.avatarUrl as string);
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to remove photo. Please try again.");
        return;
      }
      setAvatarUrl(null);
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-12 w-12 rounded-full object-cover border-2 border-border"
            />
          ) : (
            <Initials name={displayName} />
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
          >
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            Upload
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
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
      />

      {/* Error */}
      {error && (
        <div role="alert" className="flex items-center gap-1.5 text-sm text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}
