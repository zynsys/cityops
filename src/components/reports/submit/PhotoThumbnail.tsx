"use client";

import { X } from "lucide-react";

interface PhotoThumbnailProps {
  file: File;
  objectUrl: string;
  onRemove: () => void;
}

export default function PhotoThumbnail({
  file,
  objectUrl,
  onRemove,
}: PhotoThumbnailProps) {
  return (
    <div className="relative group rounded-lg overflow-hidden border border-border bg-muted aspect-square">
      {/* Preview image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={objectUrl}
        alt={file.name}
        className="w-full h-full object-cover"
      />

      {/* Filename overlay at bottom */}
      <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 py-1 text-white text-[10px] leading-tight truncate">
        {file.name}
      </div>

      {/* Remove button — always visible */}
      <button
        type="button"
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
      >
        <X size={10} strokeWidth={3} />
      </button>
    </div>
  );
}
