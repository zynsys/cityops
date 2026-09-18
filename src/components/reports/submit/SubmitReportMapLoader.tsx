'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { SubmitReportMapProps } from './SubmitReportMap';

const SubmitReportMap = dynamic(() => import('./SubmitReportMap'), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center gap-3 bg-muted text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      <p className="text-sm">Loading map…</p>
    </div>
  ),
});

export default function SubmitReportMapLoader(props: SubmitReportMapProps) {
  return <SubmitReportMap {...props} />;
}
