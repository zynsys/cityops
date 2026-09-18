"use client";

import { useState } from "react";
import Image from "next/image";
import { CategoryIcon, getCategoryTone } from "@/components/ui/CategoryIcon";

export default function ReportThumbnail({
  src,
  alt,
  categorySlug,
}: {
  src?: string;
  alt: string;
  categorySlug?: string | null;
  categoryColor?: string | null;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`relative flex h-full w-full items-center justify-center ${getCategoryTone(categorySlug)}`}
        aria-hidden="true"
      >
        <CategoryIcon slug={categorySlug} size={34} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover"
      sizes="80px"
      onError={() => setHasError(true)}
    />
  );
}
