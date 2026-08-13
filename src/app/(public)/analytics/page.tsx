import { Suspense } from "react";
import {
  getTenants,
  parseRange,
  getDashboardKPIs,
  getTrendData,
  getCategoryBreakdown,
  getStatusDistribution,
  getPriorityDistribution,
  getHeatmapPoints,
  getResolutionFunnel,
  getAnalyticsRecentReports,
} from "@/db/queries/analytics";
import DashboardFilterBar from "@/components/dashboard/DashboardFilterBar";
import DashboardGrid from "@/components/dashboard/DashboardGrid";

export const dynamic = "force-dynamic";

interface AnalyticsPageProps {
  searchParams: Promise<{ range?: string; council?: string; postcode?: string }>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const councilSlug = params.council;
  const postcode = params.postcode;

  const [
    tenants,
    kpis,
    trendData,
    categoryData,
    statusData,
    priorityData,
    heatmapPoints,
    funnelData,
    recentReports,
  ] = await Promise.all([
    getTenants(),
    getDashboardKPIs({ range, councilSlug, postcode }),
    getTrendData({ range, councilSlug, postcode }),
    getCategoryBreakdown({ range, councilSlug, postcode }),
    getStatusDistribution({ range, councilSlug, postcode }),
    getPriorityDistribution({ range, councilSlug, postcode }),
    getHeatmapPoints({ range, councilSlug, postcode }),
    getResolutionFunnel({ range, councilSlug, postcode }),
    getAnalyticsRecentReports(councilSlug, postcode),
  ]);

  return (
    <div className="flex-1">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Platform-wide insights into civic report activity.
          </p>
        </div>

        <div className="mb-8">
          <Suspense fallback={<FilterBarSkeleton />}>
            <DashboardFilterBar tenants={tenants} />
          </Suspense>
        </div>

        <DashboardGrid
          kpis={kpis}
          trendData={trendData}
          categoryData={categoryData}
          statusData={statusData}
          priorityData={priorityData}
          heatmapPoints={heatmapPoints}
          funnelData={funnelData}
          recentReports={recentReports}
          range={range}
          councilSlug={councilSlug}
          postcode={postcode}
        />
      </div>
    </div>
  );
}

function FilterBarSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
      <div className="h-10 lg:col-span-3 rounded-lg bg-muted animate-pulse" />
      <div className="h-10 lg:col-span-3 rounded-lg bg-muted animate-pulse" />
      <div className="h-10 sm:col-span-2 lg:col-span-6 rounded-lg bg-muted animate-pulse" />
    </div>
  );
}
