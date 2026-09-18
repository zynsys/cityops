import { Suspense } from 'react';
import { ChartNoAxesCombined } from 'lucide-react';
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
} from '@/db/queries/analytics';
import DashboardFilterBar from '@/components/dashboard/DashboardFilterBar';
import DashboardGrid from '@/components/dashboard/DashboardGrid';

export const dynamic = 'force-dynamic';

interface AnalyticsPageProps {
  searchParams: Promise<{ range?: string; council?: string; postcode?: string }>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const councilSlug = params.council;
  const postcode = params.postcode;

  const [tenants, kpis, trendData, categoryData, statusData, priorityData, heatmapPoints, funnelData, recentReports] =
    await Promise.all([
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
    <div className="flex-1 bg-background">
      <div className="page-shell">
        <header className="page-header flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow">Community insights</p>
            <h1 className="page-title mt-2">Analytics</h1>
            <p className="page-description mt-3">A clear view of civic reporting, local priorities and progress.</p>
          </div>
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-accent shadow-soft sm:flex">
            <ChartNoAxesCombined className="h-5 w-5" aria-hidden="true" />
          </div>
        </header>

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
    <div
      className="surface-card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-12"
      role="status"
      aria-label="Loading analytics filters"
    >
      <div className="h-16 animate-pulse rounded-xl bg-muted lg:col-span-3" />
      <div className="h-16 animate-pulse rounded-xl bg-muted lg:col-span-3" />
      <div className="h-16 animate-pulse rounded-xl bg-muted sm:col-span-2 lg:col-span-6" />
    </div>
  );
}
