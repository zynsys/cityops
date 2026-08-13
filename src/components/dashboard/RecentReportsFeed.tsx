import Link from "next/link";
import { MapPin, Clock, User, FileText } from "lucide-react";
import type { AnalyticsRecentReport } from "@/db/queries/analytics";

const STATUS_COLORS: Record<string, string> = {
  created: "bg-gray-500/15 text-gray-500",
  under_validation: "bg-sky-500/15 text-sky-500",
  validated: "bg-blue-500/15 text-blue-500",
  invalid: "bg-red-500/15 text-red-500",
  assigned: "bg-violet-500/15 text-violet-500",
  in_progress: "bg-amber-500/15 text-amber-500",
  resolved: "bg-emerald-500/15 text-emerald-500",
  closed: "bg-gray-600/15 text-gray-400",
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

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface RecentReportsFeedProps {
  data: AnalyticsRecentReport[];
}

export default function RecentReportsFeed({ data }: RecentReportsFeedProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Recent Reports</h2>
        <div className="mt-8 flex flex-col items-center justify-center py-12 gap-3">
          <FileText className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No reports for the selected filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Recent Reports</h2>
      </div>

      <ul className="divide-y divide-border">
        {data.map((report) => (
          <li key={report.id}>
            <Link
              href={`/reports/${report.id}`}
              className="flex items-start gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
            >
              {/* Category colour dot */}
              <div
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: report.categoryColor ?? "#94a3b8" }}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {report.title}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none ${
                      STATUS_COLORS[report.status] ?? "bg-gray-500/15 text-gray-500"
                    }`}
                  >
                    {STATUS_LABELS[report.status] ?? report.status}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">
                    {report.categoryName}
                  </span>
                  {report.locationText && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[180px]">{report.locationText}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3 shrink-0" />
                    <span>{report.reporterName ?? "Anonymous"}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{formatRelativeTime(new Date(report.createdAt))}</span>
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
