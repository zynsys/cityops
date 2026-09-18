import Link from 'next/link';
import { ArrowRight, ArrowUpRight, MapPin, Clock, User } from 'lucide-react';
import { getRecentReports } from '@/db/queries/reports';
import { StatusBadge } from '@/components/ui/StatusBadge';
import ReportThumbnail from './ReportThumbnail';

function formatTimestamp(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default async function RecentReports() {
  const reports = await getRecentReports();

  const hasReports = reports.length > 0;

  return (
    <section className="border-b border-border bg-background py-16 sm:py-20" aria-labelledby="recent-reports-title">
      <div className="section-shell">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">In your community</p>
            <h2
              id="recent-reports-title"
              className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Recently submitted reports
            </h2>
            <p className="page-description">Local issues, shared progress. See what your neighbours are reporting.</p>
          </div>
          <Link href="/reports" className="btn-secondary">
            View all reports <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {hasReports ? (
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {reports.map((report) => {
              const location = report.locationText ?? report.tenant.name;

              return (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="group surface-card flex min-w-0 items-start gap-4 p-4 transition-[border-color,box-shadow] hover:border-accent/40 hover:shadow-raised sm:p-5"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl sm:h-14 sm:w-14">
                    <ReportThumbnail
                      alt={report.title}
                      categorySlug={report.category.slug}
                      categoryColor={report.category.color}
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">{report.category.name}</span>
                      <StatusBadge status={report.status} />
                    </div>

                    <h3 className="flex items-start justify-between gap-2 text-base leading-snug font-semibold tracking-tight text-foreground transition-colors group-hover:text-accent">
                      <span className="line-clamp-2">{report.title}</span>
                      <ArrowUpRight
                        size={16}
                        className="mt-0.5 shrink-0 text-muted-foreground transition-colors group-hover:text-accent"
                        aria-hidden="true"
                      />
                    </h3>

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p className="flex min-w-0 items-center gap-1.5">
                        <MapPin size={13} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{location}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 pt-3">
                        <span className="flex items-center gap-1.5">
                          <User size={13} className="shrink-0" aria-hidden="true" />
                          {report.reporter?.displayName ?? 'Anonymous'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="shrink-0" aria-hidden="true" />
                          <time dateTime={report.createdAt.toISOString()}>{formatTimestamp(report.createdAt)}</time>
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state mt-8">
            <MapPin className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-foreground">No reports submitted yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to report an issue in your area.</p>
          </div>
        )}
      </div>
    </section>
  );
}
