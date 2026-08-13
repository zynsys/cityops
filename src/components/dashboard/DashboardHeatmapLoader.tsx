"use client";

import dynamic from "next/dynamic";
import type { HeatmapPoint } from "@/db/queries/analytics";

const DashboardHeatmap = dynamic(
  () => import("@/components/dashboard/DashboardHeatmap"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Report Density</h3>
        </div>
        <div className="h-[250px] md:h-[350px] flex items-center justify-center bg-muted/30">
          <p className="text-muted-foreground text-sm">Loading map…</p>
        </div>
      </div>
    ),
  }
);

interface DashboardHeatmapLoaderProps {
  points: HeatmapPoint[];
  councilSlug?: string;
  postcode?: string;
}

export default function DashboardHeatmapLoader({ points, councilSlug, postcode }: DashboardHeatmapLoaderProps) {
  return <DashboardHeatmap points={points} councilSlug={councilSlug} postcode={postcode} />;
}
