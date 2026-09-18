'use client';

import dynamic from 'next/dynamic';
import type { PublicReport } from '@/db/queries/reports';
import { Map as MapIcon } from 'lucide-react';

const ReportsMap = dynamic(() => import('@/components/reports/ReportsMap'), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/50">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface text-accent motion-safe:animate-pulse">
        <MapIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm text-muted-foreground">Loading map…</p>
    </div>
  ),
});

interface ReportsMapLoaderProps {
  reports: PublicReport[];
  councilSlug?: string;
  fitBounds?: boolean;
}

export default function ReportsMapLoader({ reports, councilSlug, fitBounds }: ReportsMapLoaderProps) {
  return <ReportsMap reports={reports} councilSlug={councilSlug} fitBounds={fitBounds} />;
}
