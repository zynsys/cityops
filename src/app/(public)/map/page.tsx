import { getMapReports } from '@/db/queries/reports';
import ReportMapLoader from '@/components/map/ReportMapLoader';
import Link from 'next/link';
import { List } from 'lucide-react';

interface MapPageProps {
  searchParams: Promise<{ lat?: string; lng?: string; zoom?: string }>;
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = await searchParams;
  let reports = await getMapReports();
  if (!reports) reports = [];

  const focusLocation =
    params.lat && params.lng
      ? {
          lat: parseFloat(params.lat),
          lng: parseFloat(params.lng),
          zoom: params.zoom ? parseInt(params.zoom, 10) : 16,
        }
      : undefined;

  return (
    <div className="section-shell flex h-[calc(100dvh-65px)] min-h-[40rem] flex-col gap-5 py-6 sm:gap-6 sm:py-8">
      <div className="page-header mb-0 shrink-0">
        <div>
          <p className="eyebrow">Explore your community</p>
          <h1 className="page-title mt-2">Report map</h1>
          <p className="page-description">See reported issues across the UK. Select a pin for details.</p>
        </div>
        <Link href="/reports" className="btn-secondary">
          <List className="h-4 w-4" aria-hidden="true" />
          Browse reports
        </Link>
      </div>
      <div className="surface-card relative min-h-0 flex-1 overflow-hidden">
        <ReportMapLoader reports={reports} focusLocation={focusLocation} />
      </div>
    </div>
  );
}
