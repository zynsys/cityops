import { MapPin } from "lucide-react";
import Link from "next/link";
import type { ReportDetail, ReportCoordinates } from "@/db/queries/reports";
import ReportLocationMapLoader from "./ReportLocationMapLoader";

interface ReportSidebarProps {
  report: ReportDetail & { coordinates: ReportCoordinates | null };
}

export default function ReportSidebar({ report }: ReportSidebarProps) {
  return (
    <div className="relative h-full w-full">
      {report.coordinates ? (
        <ReportLocationMapLoader
          latitude={report.coordinates.latitude}
          longitude={report.coordinates.longitude}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <p className="text-sm text-muted-foreground">No location data</p>
        </div>
      )}

      {/* Overlay: location text + view-on-map link */}
      <div className="absolute bottom-4 left-4 z-10 rounded-lg bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm dark:bg-gray-900/90">
        {report.locationText && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {report.locationText}
          </p>
        )}
        <Link
          href={report.coordinates ? `/map?lat=${report.coordinates.latitude}&lng=${report.coordinates.longitude}&zoom=16` : "/map"}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent link-hover"
        >
          Open in full map &rarr;
        </Link>
      </div>
    </div>
  );
}
