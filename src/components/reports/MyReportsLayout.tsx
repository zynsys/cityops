'use client';

import { useState } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
import { ReportsPageContextProvider } from './ReportsPageContext';
import MyReportListPanel from './MyReportListPanel';
import ReportsMapLoader from './ReportsMapLoader';
import type { MyReportSummary, CategoryOption, TenantOption } from '@/db/queries/reports';
import type { PublicReport } from '@/db/queries/reports';

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
    tenant_slug: '',
    thumbnailUrl: r.thumbnailUrl,
  }));

  return (
    <ReportsPageContextProvider>
      <div className="section-shell pt-6 pb-24 sm:pt-8 lg:pb-8">
        <div className="relative grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Left panel: list */}
          <div className="surface-card flex min-w-0 flex-col overflow-hidden">
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
          <div className="surface-card sticky top-24 hidden h-[calc(100dvh-8rem)] min-h-[28rem] min-w-0 flex-col overflow-hidden lg:flex">
            <div className="flex shrink-0 items-center gap-3 border-b border-border p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-accent">
                <MapIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Your report locations</h2>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Select a pin to view a report.</p>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <ReportsMapLoader reports={mapReports} fitBounds={false} />
            </div>
          </div>

          {/* Mobile: floating "Show map" button */}
          {!showMobileMap && (
            <button
              type="button"
              onClick={() => setShowMobileMap(true)}
              className="btn-primary fixed right-4 bottom-5 z-40 rounded-full shadow-raised lg:hidden"
            >
              <MapIcon className="h-4 w-4" aria-hidden="true" />
              Show map
            </button>
          )}

          {/* Mobile: full-screen map overlay */}
          {showMobileMap && (
            <div className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden">
              <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface p-4">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <MapIcon className="h-5 w-5 text-accent" aria-hidden="true" />
                  Your report locations
                </h2>
                <button
                  type="button"
                  onClick={() => setShowMobileMap(false)}
                  className="btn-secondary h-11 w-11 shrink-0 p-0"
                  aria-label="Close map"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <ReportsMapLoader reports={mapReports} fitBounds={false} />
              </div>
            </div>
          )}
        </div>
      </div>
    </ReportsPageContextProvider>
  );
}
