"use client";

import dynamic from "next/dynamic";
import type { MapReport } from "@/db/queries/reports";

const ReportMap = dynamic(() => import("@/components/map/ReportMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Loading map…</p>
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
