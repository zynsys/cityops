'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Expand } from 'lucide-react';
interface Attachment {
  id: string;
  type: string;
  storagePath: string;
  altText: string | null;
  fileName: string;
}

interface ReportAttachmentGalleryProps {
  attachments: Attachment[];
}

export default function ReportAttachmentGallery({ attachments }: ReportAttachmentGalleryProps) {
  const images = attachments.filter((a) => a.type === 'image');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Attachments</h2>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="group relative aspect-4/3 min-w-0 overflow-hidden rounded-xl border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label={`Open attachment ${i + 1}: ${img.altText ?? img.fileName}`}
          >
            <Image
              src={img.storagePath}
              alt={img.altText ?? img.fileName}
              fill
              className="object-cover transition-transform duration-200 motion-safe:group-hover:scale-105"
              sizes="(min-width: 1280px) 240px, (min-width: 640px) 30vw, 45vw"
            />
            <span className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface/95 text-foreground shadow-soft">
              <Expand className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm sm:p-6"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <div
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-raised"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-border p-3 sm:px-5">
              <p className="min-w-0 break-words text-sm font-medium text-foreground">
                {images[lightboxIndex].altText ?? images[lightboxIndex].fileName}
              </p>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="btn-secondary h-11 w-11 shrink-0 p-0"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="bg-muted/40 p-2 sm:p-4">
              <Image
                src={images[lightboxIndex].storagePath}
                alt={images[lightboxIndex].altText ?? images[lightboxIndex].fileName}
                width={1200}
                height={900}
                className="mx-auto max-h-[75dvh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
