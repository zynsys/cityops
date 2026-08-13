"use client";

import { useState } from "react";
import { Map as MapIcon, X } from "lucide-react";
import { ReportsPageContextProvider } from "./ReportsPageContext";
import MyReportListPanel from "./MyReportListPanel";
import ReportsMapLoader from "./ReportsMapLoader";
import type { MyReportSummary, CategoryOption, TenantOption } from "@/db/queries/reports";
import type { PublicReport } from "@/db/queries/reports";

interface MyReportsLayoutProps {
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

export default function MyReportsLayout({
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
}: MyReportsLayoutProps) {
  const [showMobileMap, setShowMobileMap] = useState(false);

  // Map MyReportSummary → PublicReport shape for the shared map component
  const mapReports: PublicReport[] = reports.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    priority: r.priority,
    locationText: r.locationText,
    createdAt: r.createdAt as Date,
    updatedAt: r.updatedAt as Date,
    latitude: r.latitude,
    longitude: r.longitude,
    category_name: r.categoryName,
    category_slug: r.categorySlug,
    category_color: r.categoryColor,
    tenant_name: r.tenantName,
    tenant_slug: "",
    thumbnailUrl: r.thumbnailUrl,
  }));

  return (
    <ReportsPageContextProvider>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100dvh-65px)] overflow-hidden">
        <div className="relative flex h-full overflow-hidden">
          {/* Left panel: list */}
          <div className="w-full lg:w-[520px] xl:w-[560px] flex-shrink-0 flex flex-col overflow-hidden lg:border-r border-border lg:pr-4">
            <MyReportListPanel
              reports={reports}
              total={total}
              categories={categories}
              tenants={tenants}
              currentPage={currentPage}
              currentStatus={currentStatus}
              currentCategory={currentCategory}
              currentCouncil={currentCouncil}
              currentPostcode={currentPostcode}
              currentCity={currentCity}
              currentSort={currentSort}
              hasFilters={hasFilters}
            />
          </div>

          {/* Right panel: map (desktop only) */}
          <div className="hidden lg:block flex-1">
            <ReportsMapLoader reports={mapReports} fitBounds={false} />
          </div>

          {/* Mobile: floating "Show map" button */}
          {!showMobileMap && (
            <button
              type="button"
              onClick={() => setShowMobileMap(true)}
              className="lg:hidden fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-4 py-2.5 text-sm font-semibold shadow-lg"
            >
              <MapIcon className="h-4 w-4" aria-hidden="true" />
              Show map
            </button>
          )}

          {/* Mobile: full-screen map overlay */}
          {showMobileMap && (
            <div className="lg:hidden fixed inset-0 z-50 bg-background">
              <button
                type="button"
                onClick={() => setShowMobileMap(false)}
                className="absolute top-3 right-3 z-10 rounded-full bg-surface/90 backdrop-blur-sm p-2 shadow-md"
                aria-label="Close map"
              >
                <X className="h-5 w-5 text-foreground" />
              </button>
              <ReportsMapLoader reports={mapReports} fitBounds={false} />
            </div>
          )}
        </div>
      </div>
    </ReportsPageContextProvider>
  );
}
