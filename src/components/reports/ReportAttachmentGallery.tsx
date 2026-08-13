"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
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

export default function ReportAttachmentGallery({
  attachments,
}: ReportAttachmentGalleryProps) {
  const images = attachments.filter((a) => a.type === "image");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-white">Attachments</h2>

      <div className="mt-3 flex flex-wrap gap-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <Image
              src={img.storagePath}
              alt={img.altText ?? img.fileName}
              fill
              className="object-cover"
              sizes="80px"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={images[lightboxIndex].storagePath}
              alt={images[lightboxIndex].altText ?? images[lightboxIndex].fileName}
              width={1200}
              height={900}
              className="max-h-[90vh] w-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
