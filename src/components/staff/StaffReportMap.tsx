'use client';

import dynamic from 'next/dynamic';

const ReportLocationMap = dynamic(() => import('@/components/reports/ReportLocationMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full animate-pulse items-center justify-center bg-muted/40" role="status">
      <span className="text-sm text-muted-foreground">Loading report location…</span>
    </div>
  ),
});

interface StaffReportMapProps {
  lat: number;
  lng: number;
}

export function StaffReportMap({ lat, lng }: StaffReportMapProps) {
  return <ReportLocationMap latitude={lat} longitude={lng} />;
}
