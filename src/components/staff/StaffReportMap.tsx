"use client";

import dynamic from "next/dynamic";

const ReportLocationMap = dynamic(
  () => import("@/components/reports/ReportLocationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-lg bg-muted" />
    ),
  }
);

interface StaffReportMapProps {
  lat: number;
  lng: number;
}

export function StaffReportMap({ lat, lng }: StaffReportMapProps) {
  return <ReportLocationMap latitude={lat} longitude={lng} />;
}
