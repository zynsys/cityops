import Link from 'next/link';
import { MapPin, Clock, User, FileText } from 'lucide-react';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AnalyticsRecentReport } from '@/db/queries/analytics';

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface RecentReportsFeedProps {
  data: AnalyticsRecentReport[];
}

export default function RecentReportsFeed({ data }: RecentReportsFeedProps) {
  if (data.length === 0) {
    return (
      <div className="surface-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-foreground">Recent reports</h2>
        <div className="empty-state mt-6 flex flex-col items-center justify-center gap-3 bg-muted/20 py-12">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">No reports for the selected filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-border p-5 sm:px-6">
        <h2 className="text-base font-semibold text-foreground">Recent reports</h2>
        <p className="mt-1 text-sm text-muted-foreground">The latest reports from your selected area</p>
      </div>

      <ul className="divide-y divide-border">
        {data.map((report) => (
          <li key={report.id}>
            <Link
              href={`/reports/${report.id}`}
              className="group flex items-start gap-3 p-5 transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:gap-4 sm:px-6"
            >
              {/* Category fallback artwork */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                <CategoryIcon size={20} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
                  <p className="line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-accent">
                    {report.title}
                  </p>
                  <StatusBadge status={report.status} className="shrink-0" />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 font-medium text-foreground">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: report.categoryColor ?? 'var(--color-muted-foreground)',
                        filter: 'saturate(0.55)',
                      }}
                      aria-hidden="true"
                    />
                    {report.categoryName}
                  </span>
                  {report.locationText && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                      <span className="truncate max-w-[180px]">{report.locationText}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <User className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                    <span>{report.reporterName ?? 'Anonymous'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
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
