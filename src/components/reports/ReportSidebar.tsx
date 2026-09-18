import { MapPin, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { ReportDetail, ReportCoordinates } from '@/db/queries/reports';
import ReportLocationMapLoader from './ReportLocationMapLoader';

interface ReportSidebarProps {
  report: ReportDetail & { coordinates: ReportCoordinates | null };
}

export default function ReportSidebar({ report }: ReportSidebarProps) {
  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <div className="min-h-0 flex-1">
        {report.coordinates ? (
          <ReportLocationMapLoader latitude={report.coordinates.latitude} longitude={report.coordinates.longitude} />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/50 px-5">
            <MapPin className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No location data</p>
          </div>
        )}
      </div>

      {/* Location details remain below the map so long addresses cannot cover it. */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        {report.locationText && (
          <div
            className="max-h-24 overflow-y-auto rounded-md pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            tabIndex={0}
            role="region"
            aria-label="Reported location"
          >
            <p className="flex min-w-0 items-start gap-2 text-sm font-medium leading-6 text-foreground">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span className="min-w-0 break-words">{report.locationText}</span>
            </p>
          </div>
        )}
        <Link
          href={
            report.coordinates
              ? `/map?lat=${report.coordinates.latitude}&lng=${report.coordinates.longitude}&zoom=16`
              : '/map'
          }
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-accent hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Open in full map
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
