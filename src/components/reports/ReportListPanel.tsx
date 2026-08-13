"use client";

import { Suspense } from "react";
import { MapPinOff } from "lucide-react";
import ReportFilters from "./ReportFilters";
import ReportListItem from "./ReportListItem";
import ReportListPagination from "./ReportListPagination";
import ReportLocationSearch from "./ReportLocationSearch";
import type { PublicReport, CategoryOption } from "@/db/queries/reports";

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Always-visible header: location search + filters */}
      <div className="pt-4 pb-3 border-b border-border space-y-3 shrink-0">
        <h1 className="text-base font-bold text-foreground">Reports</h1>
        <Suspense fallback={<div className="h-20" />}>
          <ReportLocationSearch
            tenants={tenants}
            currentCouncil={currentCouncil}
            currentPostcode={currentPostcode}
            currentCity={currentCity}
          />
        </Suspense>
        <Suspense fallback={<div className="h-9" />}>
          <ReportFilters
            categories={categories}
            currentStatus={currentStatus}
            currentCategory={currentCategory}
            currentSort={currentSort}
          />
        </Suspense>
        {hasLocation && total > 0 && (
          <p className="text-xs text-muted-foreground">
            {from} to {to} of{" "}
            <span className="font-semibold text-foreground">{total}</span>{" "}
            reports
            {locationHeading && (
              <span className="ml-1">in {locationHeading}</span>
            )}
          </p>
        )}
        {!hasLocation && total > 0 && (
          <p className="text-xs text-muted-foreground">
            {from} to {to} of{" "}
            <span className="font-semibold text-foreground">{total}</span>{" "}
            reports across all councils
          </p>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
            {total === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <MapPinOff
                  className="h-8 w-8 text-muted-foreground/40"
                  aria-hidden="true"
                />
                {hasFilters ? (
                  <>
                    <p className="font-semibold text-foreground">No reports found</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your filters.
                    </p>
                    <a
                      href={`/reports?${locationParams}`}
                      className="text-sm text-accent hover:underline"
                    >
                      Clear filters
                    </a>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">
                      No reports in this area yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Check back later or try a different location.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div>
                {reports.map((report) => (
                  <ReportListItem key={report.id} report={report} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          <Suspense fallback={null}>
            <ReportListPagination
              currentPage={currentPage}
              total={total}
              pageSize={PAGE_SIZE}
            />
          </Suspense>
    </div>
  );
}
