'use client';

import { X } from 'lucide-react';

interface PhotoThumbnailProps {
  file: File;
  objectUrl: string;
  onRemove: () => void;
}

export default function PhotoThumbnail({ file, objectUrl, onRemove }: PhotoThumbnailProps) {
  return (
    <div className="relative group aspect-square overflow-hidden rounded-xl border border-border bg-muted shadow-xs">
      {/* Preview image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={objectUrl} alt={file.name} className="w-full h-full object-cover" />

      {/* Filename overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 truncate border-t border-border bg-surface/95 px-3 py-2 text-xs text-foreground">
        {file.name}
      </div>

      {/* Remove button — always visible */}
      <button
        type="button"
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
        className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface/95 text-foreground shadow-soft transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
