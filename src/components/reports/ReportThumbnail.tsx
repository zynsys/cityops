"use client";

import { useState } from "react";
import React from "react";
import Image from "next/image";
import { FaRoad, FaLightbulb, FaPaintBrush, FaWater, FaRecycle, FaTree, FaCar, FaVolumeUp, FaFlag } from "react-icons/fa";
import type { IconType } from "react-icons";

const CATEGORY_ICONS: Record<string, IconType> = {
  "road-pavement": FaRoad,
  "street-lighting": FaLightbulb,
  "graffiti-vandalism": FaPaintBrush,
  "drainage-flooding": FaWater,
  "waste-recycling": FaRecycle,
  "parks-green-spaces": FaTree,
  "noise-pollution": FaVolumeUp,
  "abandoned-vehicles": FaCar,
};

export default function ReportThumbnail({
  src,
  alt,
  categorySlug,
  categoryColor,
}: {
  src?: string;
  alt: string;
  categorySlug?: string | null;
  categoryColor?: string | null;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    const Icon: IconType = (categorySlug && CATEGORY_ICONS[categorySlug]) || FaFlag;
    const bg = categoryColor ? `${categoryColor}1a` : undefined;
    const iconColor = categoryColor ?? "#94a3b8";
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-muted"
        style={bg ? { backgroundColor: bg } : undefined}
        aria-hidden="true"
      >
        <Icon size={36} color={iconColor} />
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
