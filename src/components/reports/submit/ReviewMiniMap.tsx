'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { ReviewMiniMapInnerProps } from './ReviewMiniMapInner';

const ReviewMiniMapInner = dynamic(() => import('./ReviewMiniMapInner'), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center gap-2 bg-muted text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      <p className="text-sm">Loading map…</p>
    </div>
  ),
});

export default function ReviewMiniMap(props: ReviewMiniMapInnerProps) {
  return <ReviewMiniMapInner {...props} />;
}
