'use client';

import { Suspense } from 'react';
import { MapPinOff } from 'lucide-react';
import ReportFilters from './ReportFilters';
import ReportListItem from './ReportListItem';
import ReportListPagination from './ReportListPagination';
import ReportLocationSearch from './ReportLocationSearch';
import type { PublicReport, CategoryOption } from '@/db/queries/reports';

interface TenantOption {
  slug: string;
  name: string;
}

const PAGE_SIZE = 20;

interface ReportListPanelProps {
  reports: PublicReport[];
  total: number;
  categories: CategoryOption[];
  tenants: TenantOption[];
  currentPage: number;
  currentStatus: string;
  currentCategory: string;
  currentSort: string;
  currentCouncil: string;
  currentPostcode: string;
  currentCity: string;
  locationHeading: string | null;
  hasFilters: boolean;
  hasLocation: boolean;
  locationParams: string;
}

export default function ReportListPanel({
  reports,
  total,
  categories,
  tenants,
  currentPage,
  currentStatus,
  currentCategory,
  currentSort,
  currentCouncil,
  currentPostcode,
  currentCity,
  locationHeading,
  hasFilters,
  hasLocation,
  locationParams,
}: ReportListPanelProps) {
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="flex min-h-0 min-w-0 flex-col lg:h-full">
      {/* Always-visible header: location search + filters */}
      <div className="shrink-0 space-y-4 border-b border-border p-5 sm:p-6">
        <div>
          <p className="eyebrow">Community reports</p>
          <h1 className="page-title mt-2">Reports</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Explore local issues and follow their progress.
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
            categories={categories}
            currentStatus={currentStatus}
            currentCategory={currentCategory}
            currentSort={currentSort}
          />
        </Suspense>
        {hasLocation && total > 0 && (
          <p className="border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
            {from} to {to} of <span className="font-semibold tabular-nums text-foreground">{total}</span> reports
            {locationHeading && <span className="block break-words text-xs">{locationHeading}</span>}
          </p>
        )}
        {!hasLocation && total > 0 && (
          <p className="border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
            {from} to {to} of <span className="font-semibold tabular-nums text-foreground">{total}</span> reports across
            all councils
          </p>
        )}
      </div>

      {/* Scrollable list */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {total === 0 ? (
          <div className="empty-state gap-3 px-4 py-12">
            <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <MapPinOff className="h-6 w-6" aria-hidden="true" />
            </span>
            {hasFilters ? (
              <>
                <p className="font-semibold text-foreground">No reports found</p>
                <p className="text-sm leading-6 text-muted-foreground">Try adjusting your filters.</p>
                <a href={`/reports?${locationParams}`} className="btn-secondary mt-2">
                  Clear filters
                </a>
              </>
            ) : (
              <>
                <p className="font-semibold text-foreground">No reports in this area yet</p>
                <p className="text-sm leading-6 text-muted-foreground">Check back later or try a different location.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <ReportListItem key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <Suspense fallback={null}>
        <ReportListPagination currentPage={currentPage} total={total} pageSize={PAGE_SIZE} />
      </Suspense>
    </div>
  );
}
