'use client';

import { useState } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
import { ReportsPageContextProvider } from './ReportsPageContext';
import ReportListPanel from './ReportListPanel';
import ReportsMapLoader from './ReportsMapLoader';
import type { PublicReport, CategoryOption } from '@/db/queries/reports';

interface TenantOption {
  slug: string;
  name: string;
}

interface ReportsLayoutProps {
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
  councilSlug?: string;
}

export default function ReportsLayout(props: ReportsLayoutProps) {
  const [showMobileMap, setShowMobileMap] = useState(false);

  return (
    <ReportsPageContextProvider>
      <div className="section-shell pt-6 pb-24 sm:pt-8 lg:pb-8">
        <div className="relative grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Left panel: list */}
          <div className="surface-card flex min-w-0 flex-col overflow-hidden">
            <ReportListPanel {...props} />
          </div>

          {/* Right panel: map (desktop only) */}
          <div className="surface-card sticky top-24 hidden h-[calc(100dvh-8rem)] min-h-[28rem] min-w-0 flex-col overflow-hidden lg:flex">
            <div className="flex shrink-0 items-center gap-3 border-b border-border p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-accent">
                <MapIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Report locations</h2>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Select a pin to view a report.</p>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <ReportsMapLoader reports={props.reports} councilSlug={props.councilSlug} />
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
                  Report locations
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
                <ReportsMapLoader reports={props.reports} councilSlug={props.councilSlug} />
              </div>
            </div>
          )}
        </div>
      </div>
    </ReportsPageContextProvider>
  );
}
