'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import MyReportCard from './MyReportCard';
import MyReportsPagination from './MyReportsPagination';
import ReportFilters from './ReportFilters';
import ReportLocationSearch from './ReportLocationSearch';
import type { MyReportSummary, CategoryOption, TenantOption } from '@/db/queries/reports';

const PAGE_SIZE = 10;

interface MyReportListPanelProps {
  reports: MyReportSummary[];
  total: number;
  categories: CategoryOption[];
  tenants: TenantOption[];
  currentPage: number;
  currentStatus: string;
  currentCategory: string;
  currentCouncil: string;
  currentPostcode: string;
  currentCity: string;
  currentSort: string;
  hasFilters: boolean;
}

export default function MyReportListPanel({
  reports,
  total,
  categories,
  tenants,
  currentPage,
  currentStatus,
  currentCategory,
  currentCouncil,
  currentPostcode,
  currentCity,
  currentSort,
  hasFilters,
}: MyReportListPanelProps) {
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="flex min-h-0 min-w-0 flex-col lg:h-full">
      {/* Header */}
      <div className="shrink-0 space-y-4 border-b border-border p-5 sm:p-6">
        <div>
          <p className="eyebrow">Your activity</p>
          <h1 className="page-title mt-2">My Reports</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Follow the issues you&apos;ve reported in your community.
          </p>
        </div>
        <Suspense
          fallback={
            <div
              className="h-[156px] animate-pulse rounded-xl bg-muted sm:h-[72px]"
              role="status"
              aria-label="Loading location filters"
            />
          }
        >
          <ReportLocationSearch
            basePath="/my-reports"
            tenants={tenants}
            currentCouncil={currentCouncil}
            currentPostcode={currentPostcode}
            currentCity={currentCity}
          />
        </Suspense>
        <Suspense
          fallback={
            <div
              className="h-[156px] animate-pulse rounded-xl bg-muted"
              role="status"
              aria-label="Loading report filters"
            />
          }
        >
          <ReportFilters
            basePath="/my-reports"
            categories={categories}
            currentStatus={currentStatus}
            currentCategory={currentCategory}
            currentSort={currentSort || 'created_desc'}
          />
        </Suspense>
        {total > 0 && (
          <p className="border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
            {from} to {to} of <span className="font-semibold tabular-nums text-foreground">{total}</span> report
            {total === 1 ? '' : 's'} submitted
          </p>
        )}
      </div>

      {/* Scrollable list */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {total === 0 ? (
          hasFilters ? (
            <div className="empty-state gap-3 px-4 py-12">
              <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <ClipboardList className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="font-semibold text-foreground">No reports found</p>
              <p className="text-sm leading-6 text-muted-foreground">Try adjusting your filters.</p>
              <a href="/my-reports" className="btn-secondary mt-2">
                Clear filters
              </a>
            </div>
          ) : (
            <div className="empty-state gap-4 px-4 py-12">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <ClipboardList className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-2">
                <p className="font-semibold text-foreground">No reports yet</p>
                <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                  You haven&apos;t submitted any reports. Help improve your community by reporting a problem near you.
                </p>
              </div>
              <Link href="/reports/new" className="btn-primary">
                Submit a report
              </Link>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <MyReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination footer */}
      <Suspense fallback={null}>
        <MyReportsPagination currentPage={currentPage} total={total} pageSize={PAGE_SIZE} />
      </Suspense>
    </div>
  );
}
