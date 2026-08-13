"use client";

import { useState } from "react";
import { Map as MapIcon, X } from "lucide-react";
import { ReportsPageContextProvider } from "./ReportsPageContext";
import ReportListPanel from "./ReportListPanel";
import ReportsMapLoader from "./ReportsMapLoader";
import type { PublicReport, CategoryOption } from "@/db/queries/reports";

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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-[calc(100dvh-65px)] overflow-hidden">
        <div className="relative flex h-full overflow-hidden">
          {/* Left panel: list */}
          <div className="w-full lg:w-[520px] xl:w-[560px] flex-shrink-0 flex flex-col overflow-hidden lg:border-r border-border lg:pr-4">
            <ReportListPanel {...props} />
          </div>

          {/* Right panel: map (desktop only) */}
          <div className="hidden lg:block flex-1">
            <ReportsMapLoader reports={props.reports} councilSlug={props.councilSlug} />
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
              <ReportsMapLoader reports={props.reports} councilSlug={props.councilSlug} />
            </div>
          )}
        </div>
      </div>
    </ReportsPageContextProvider>
  );
}
