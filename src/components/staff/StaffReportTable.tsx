import Link from 'next/link';
import { ArrowLeft, ArrowRight, ClipboardList } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from './PriorityBadge';

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}
import type { StaffReportRow } from '@/db/queries/staff/reports';

interface StaffReportTableProps {
  reports: StaffReportRow[];
  total: number;
  page: number;
  hasFilters: boolean;
  searchParams?: Record<string, string | undefined>;
}

const PAGE_SIZE = 25;

export function StaffReportTable({ reports, total, page, hasFilters, searchParams }: StaffReportTableProps) {
  if (reports.length === 0) {
    return (
      <div className="surface-card empty-state flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-base font-semibold text-foreground">No reports found</h2>
        <p className="text-sm text-muted-foreground">
          {hasFilters ? (
            <>
              Try adjusting your filters or{' '}
              <Link href="/staff/reports" className="font-medium text-accent underline underline-offset-4">
                clear all filters
              </Link>
              .
            </>
          ) : (
            'No reports have been submitted for your council yet.'
          )}
        </p>
      </div>
    );
  }

  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      {/* Count */}
      <p className="mb-4 text-sm text-muted-foreground tabular-nums">
        Showing {from}–{to} of {total} report{total !== 1 ? 's' : ''}
      </p>

      {/* Desktop table */}
      <div className="surface-card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1080px] text-sm">
          <caption className="sr-only">Staff report queue</caption>
          <thead className="border-b border-border bg-muted/45 text-xs tracking-wide">
            <tr>
              <th scope="col" className="px-5 py-4 text-left font-semibold text-muted-foreground">
                Title
              </th>
              <th scope="col" className="px-4 py-4 text-left font-semibold text-muted-foreground">
                Category
              </th>
              <th scope="col" className="px-4 py-4 text-left font-semibold text-muted-foreground">
                Status
              </th>
              <th scope="col" className="px-4 py-4 text-left font-semibold text-muted-foreground">
                Priority
              </th>
              <th scope="col" className="px-4 py-4 text-left font-semibold text-muted-foreground">
                Reported by
              </th>
              <th scope="col" className="px-4 py-4 text-left font-semibold text-muted-foreground">
                Assigned to
              </th>
              <th scope="col" className="px-4 py-4 text-left font-semibold text-muted-foreground">
                Submitted
              </th>
              <th scope="col" className="px-4 py-4 text-left font-semibold text-muted-foreground">
                Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reports.map((report) => (
              <tr
                key={report.id}
                className="group bg-surface transition-colors hover:bg-muted/30 focus-within:bg-muted/30"
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/staff/reports/${report.id}`}
                    className="flex min-h-11 items-center rounded-md font-semibold text-foreground transition-colors group-hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span title={report.title} className="block max-w-[280px] truncate">
                      {report.title}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-4">
                  <span className="flex items-center gap-2">
                    {report.category.color && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: report.category.color, filter: 'saturate(0.55)' }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-foreground">{report.category.name}</span>
                  </span>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={report.status} />
                </td>
                <td className="px-4 py-4">
                  <PriorityBadge priority={report.priority} />
                </td>
                <td className="px-4 py-4 text-muted-foreground">{report.reporter.displayName}</td>
                <td className="px-4 py-4 text-muted-foreground">
                  {report.assignedUser?.displayName ?? <span className="italic">Unassigned</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground tabular-nums">
                  {formatRelativeTime(new Date(report.createdAt))}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground tabular-nums">
                  {formatRelativeTime(new Date(report.updatedAt))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden flex flex-col gap-3">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/staff/reports/${report.id}`}
            className="surface-card block p-5 transition-colors hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="mb-4 flex flex-col items-start gap-3">
              <span className="line-clamp-2 font-semibold leading-relaxed text-foreground">{report.title}</span>
              <StatusBadge status={report.status} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {report.category.color && (
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: report.category.color, filter: 'saturate(0.55)' }}
                    aria-hidden="true"
                  />
                )}
                {report.category.name}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatRelativeTime(new Date(report.createdAt))}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && <StaffReportPagination page={page} total={total} searchParams={searchParams} />}
    </div>
  );
}

function StaffReportPagination({
  page,
  total,
  searchParams,
}: {
  page: number;
  total: number;
  searchParams?: Record<string, string | undefined>;
}) {
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildHref(p: number) {
    const qs = new URLSearchParams();
    // Preserve all current filter/sort params
    if (searchParams) {
      for (const [key, val] of Object.entries(searchParams)) {
        if (key !== 'page' && val !== undefined) qs.set(key, val);
      }
    }
    qs.set('page', String(p));
    return `?${qs.toString()}`;
  }

  return (
    <div className="mt-6 flex items-center justify-between gap-2">
      <Link
        href={buildHref(page - 1)}
        aria-disabled={page <= 1}
        className={`btn-secondary px-3 sm:px-4 ${page <= 1 ? 'pointer-events-none opacity-40' : 'text-foreground'}`}
      >
        <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
        Previous
      </Link>
      <span className="text-center text-xs text-muted-foreground tabular-nums sm:text-sm">
        Page {page} of {totalPages}
      </span>
      <Link
        href={buildHref(page + 1)}
        aria-disabled={page >= totalPages}
        className={`btn-secondary px-3 sm:px-4 ${
          page >= totalPages ? 'pointer-events-none opacity-40' : 'text-foreground'
        }`}
      >
        Next
        <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
