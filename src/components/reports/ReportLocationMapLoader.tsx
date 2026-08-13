"use client";

import dynamic from "next/dynamic";

const ReportLocationMap = dynamic(
  () => import("@/components/reports/ReportLocationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <p className="text-xs text-muted-foreground">Loading map…</p>
      </div>
    ),
  }
);

interface ReportLocationMapLoaderProps {
  latitude: number;
  longitude: number;
}

export default function ReportLocationMapLoader({
  latitude,
  longitude,
}: ReportLocationMapLoaderProps) {
  return <ReportLocationMap latitude={latitude} longitude={longitude} />;
}
