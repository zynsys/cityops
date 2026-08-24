import Link from "next/link";
import { MapPin, Clock, User } from "lucide-react";
import { getRecentReports } from "@/db/queries/reports";
import ReportThumbnail from "./ReportThumbnail";

const CATEGORY_STYLES: Record<
  string,
  { badge: string; border: string }
> = {
  "road-pavement": {
    badge: "bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30",
    border: "border-l-red-500",
  },
  "street-lighting": {
    badge: "bg-blue-500/15 text-blue-500 dark:text-blue-400 border-blue-500/30",
    border: "border-l-blue-500",
  },
  "graffiti-vandalism": {
    badge: "bg-orange-500/15 text-orange-500 dark:text-orange-400 border-orange-500/30",
    border: "border-l-orange-500",
  },
  "drainage-flooding": {
    badge: "bg-sky-500/15 text-sky-500 dark:text-sky-400 border-sky-500/30",
    border: "border-l-sky-500",
  },
  "waste-recycling": {
    badge: "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30",
    border: "border-l-amber-500",
  },
  "parks-green-spaces": {
    badge: "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30",
    border: "border-l-emerald-500",
  },
};

const FALLBACK_CATEGORY_STYLE = {
  badge: "bg-gray-500/15 text-gray-500 dark:text-gray-400 border-gray-500/30",
  border: "border-l-gray-500",
};

const STATUS_COLORS: Record<string, string> = {
  created: "bg-gray-500/90 text-white",
  under_validation: "bg-sky-500/90 text-white",
  validated: "bg-blue-500/90 text-white",
  invalid: "bg-red-500/90 text-white",
  assigned: "bg-violet-500/90 text-white",
  in_progress: "bg-amber-500/90 text-white",
  resolved: "bg-emerald-500/90 text-white",
  closed: "bg-gray-600/90 text-white",
};

const STATUS_LABELS: Record<string, string> = {
  created: "Created",
  under_validation: "Under Validation",
  validated: "Validated",
  invalid: "Invalid",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

function formatTimestamp(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function RecentReports() {
  const reports = await getRecentReports();

  const hasReports = reports.length > 0;

  return (
    <section className="bg-section-primary py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header row */}
        <div>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Recently Submitted Reports
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
            See what problems your neighbors are reporting
          </p>
        </div>

        {hasReports ? (
          <>
            {/* Cards grid — 2 cols × 4 rows on desktop */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {reports.map((report) => {
                const categorySlug = report.category.slug;
                const styles =
                  CATEGORY_STYLES[categorySlug] ?? FALLBACK_CATEGORY_STYLE;
                const location =
                  report.locationText ?? report.tenant.name;

                return (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className={`group flex items-stretch overflow-hidden rounded-lg border border-border border-l-4 bg-surface transition-shadow hover:shadow-lg ${styles.border}`}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-auto w-20 shrink-0 overflow-hidden sm:w-24">
                      <ReportThumbnail
                        alt={report.title}
                        categorySlug={report.category.slug}
                        categoryColor={report.category.color}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-center gap-1.5 px-4 py-3">
                      {/* Category & status row */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none ${styles.badge}`}
                        >
                          {report.category.name}
                        </span>
                        {STATUS_COLORS[report.status] && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ${STATUS_COLORS[report.status]}`}
                          >
                            {STATUS_LABELS[report.status] ?? report.status}
                          </span>
                        )}
                      </div>

                      <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
                        {report.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0" />
                          <span>{report.reporter?.displayName ?? "Anonymous"}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{location}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatTimestamp(report.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

          </>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
            <MapPin className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 text-sm font-medium text-foreground">
              No reports submitted yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to report a report in your area
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
