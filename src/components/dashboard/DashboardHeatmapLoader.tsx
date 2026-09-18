'use client';

import dynamic from 'next/dynamic';
import { LoaderCircle, MapPin } from 'lucide-react';
import type { HeatmapPoint } from '@/db/queries/analytics';

const DashboardHeatmap = dynamic(() => import('@/components/dashboard/DashboardHeatmap'), {
  ssr: false,
  loading: () => (
    <div className="surface-card overflow-hidden">
      <div className="flex items-start gap-3 border-b border-border p-5 sm:px-6">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <div>
          <h2 className="text-base font-semibold text-foreground">Report density</h2>
          <p className="mt-1 text-sm text-muted-foreground">Geographic concentration of reported issues</p>
        </div>
      </div>
      <div className="flex h-[250px] items-center justify-center gap-3 bg-muted/20 md:h-[400px]" role="status">
        <LoaderCircle className="h-5 w-5 animate-spin text-accent" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    </div>
  ),
});

interface DashboardHeatmapLoaderProps {
  points: HeatmapPoint[];
  councilSlug?: string;
  postcode?: string;
}

export default function DashboardHeatmapLoader({ points, councilSlug, postcode }: DashboardHeatmapLoaderProps) {
  return <DashboardHeatmap points={points} councilSlug={councilSlug} postcode={postcode} />;
}
