"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import MyReportCard from "./MyReportCard";
import MyReportsPagination from "./MyReportsPagination";
import ReportFilters from "./ReportFilters";
import ReportLocationSearch from "./ReportLocationSearch";
import type { MyReportSummary, CategoryOption, TenantOption } from "@/db/queries/reports";

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="pt-4 pb-3 border-b border-border space-y-3 shrink-0">
        <h1 className="text-base font-bold text-foreground">My Reports</h1>
        <Suspense fallback={<div className="h-20" />}>
          <ReportLocationSearch
            basePath="/my-reports"
            tenants={tenants}
            currentCouncil={currentCouncil}
            currentPostcode={currentPostcode}
            currentCity={currentCity}
          />
        </Suspense>
        <Suspense fallback={<div className="h-9" />}>
          <ReportFilters
            basePath="/my-reports"
            categories={categories}
            currentStatus={currentStatus}
            currentCategory={currentCategory}
            currentSort={currentSort || "created_desc"}
          />
        </Suspense>
        {total > 0 && (
          <p className="text-xs text-muted-foreground">
            {from} to {to} of{" "}
            <span className="font-semibold text-foreground">{total}</span>{" "}
            report{total === 1 ? "" : "s"} submitted
          </p>
        )}
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {total === 0 ? (
          hasFilters ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <ClipboardList className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
              <p className="font-semibold text-foreground">No reports found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
              <a href="/my-reports" className="text-sm text-accent hover:underline">
                Clear filters
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <ClipboardList className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-foreground">No reports yet</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  You haven&apos;t submitted any reports. Help improve your community by
                  reporting a problem near you.
                </p>
              </div>
              <Link
                href="/reports/new"
                className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 transition-opacity"
              >
                Submit a report
              </Link>
            </div>
          )
        ) : (
          <div>
            {reports.map((report) => (
              <MyReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination footer */}
      <Suspense fallback={null}>
        <MyReportsPagination
          currentPage={currentPage}
          total={total}
          pageSize={PAGE_SIZE}
        />
      </Suspense>
    </div>
  );
}
