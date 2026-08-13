"use client";

import dynamic from "next/dynamic";
import type { ReviewMiniMapInnerProps } from "./ReviewMiniMapInner";

const ReviewMiniMapInner = dynamic(() => import("./ReviewMiniMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted">
      <p className="text-muted-foreground text-xs">Loading map…</p>
    </div>
  ),
});

export default function ReviewMiniMap(props: ReviewMiniMapInnerProps) {
  return <ReviewMiniMapInner {...props} />;
}
