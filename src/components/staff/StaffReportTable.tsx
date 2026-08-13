import Link from "next/link";
import { getStatusConfig, getPriorityConfig } from "@/lib/reportStatusConfig";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}
import type { StaffReportRow } from "@/db/queries/staff/reports";

interface StaffReportTableProps {
  reports: StaffReportRow[];
  total: number;
  page: number;
  hasFilters: boolean;
  searchParams?: Record<string, string | undefined>;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusConfig(status);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string | null }) {
  const cfg = getPriorityConfig(priority);
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

const PAGE_SIZE = 25;

export function StaffReportTable({ reports, total, page, hasFilters, searchParams }: StaffReportTableProps) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 text-4xl text-muted-foreground/30">📋</div>
        <h3 className="text-base font-medium text-foreground mb-1">No reports found</h3>
        <p className="text-sm text-muted-foreground">
          {hasFilters ? (
            <>Try adjusting your filters or{"\ "}
              <Link href="/staff/reports" className="text-accent hover:underline">clear all filters</Link>.
            </>
          ) : (
            "No reports have been submitted for your council yet."
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
      <p className="mb-3 text-sm text-muted-foreground">
        Showing {from}–{to} of {total} report{total !== 1 ? "s" : ""}
      </p>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <caption className="sr-only">Staff report queue</caption>
          <thead className="bg-muted/40">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Reported by</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Assigned to</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Submitted</th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reports.map((report) => (
              <tr
                key={report.id}
                className="group bg-surface hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/staff/reports/${report.id}`}
                    className="block font-medium text-foreground group-hover:text-accent transition-colors"
                  >
                    <span
                      title={report.title}
                      className="block max-w-[280px] truncate"
                    >
                      {report.title}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    {report.category.color && (
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: report.category.color }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="text-foreground">{report.category.name}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={report.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={report.priority} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {report.reporter.displayName}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {report.assignedUser?.displayName ?? <span className="italic">Unassigned</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(new Date(report.createdAt))}
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
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
            className="block rounded-xl border border-border bg-surface p-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-medium text-foreground line-clamp-2">{report.title}</span>
              <StatusBadge status={report.status} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {report.category.color && (
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: report.category.color }}
                    aria-hidden="true"
                  />
                )}
                {report.category.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(new Date(report.createdAt))}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <StaffReportPagination page={page} total={total} searchParams={searchParams} />
      )}
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
        if (key !== "page" && val !== undefined) qs.set(key, val);
      }
    }
    qs.set("page", String(p));
    return `?${qs.toString()}`;
  }

  return (
    <div className="mt-6 flex items-center justify-between">
      <Link
        href={buildHref(page - 1)}
        aria-disabled={page <= 1}
        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          page <= 1
            ? "pointer-events-none text-muted-foreground/40"
            : "text-foreground hover:bg-muted"
        }`}
      >
        ← Previous
      </Link>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Link
        href={buildHref(page + 1)}
        aria-disabled={page >= totalPages}
        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          page >= totalPages
            ? "pointer-events-none text-muted-foreground/40"
            : "text-foreground hover:bg-muted"
        }`}
      >
        Next →
      </Link>
    </div>
  );
}
