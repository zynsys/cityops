'use client';

import dynamic from 'next/dynamic';
import type { MapReport } from '@/db/queries/reports';
import { Map as MapIcon } from 'lucide-react';

const ReportMap = dynamic(() => import('@/components/map/ReportMap'), {
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

interface FocusLocation {
  lat: number;
  lng: number;
  zoom: number;
}

interface ReportMapLoaderProps {
  reports: MapReport[];
  focusLocation?: FocusLocation;
}

export default function ReportMapLoader({ reports, focusLocation }: ReportMapLoaderProps) {
  return <ReportMap reports={reports} focusLocation={focusLocation} />;
}
