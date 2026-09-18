import KpiCards from './KpiCards';
import TrendChart from './TrendChart';
import CategoryBreakdown from './CategoryBreakdown';
import StatusDistribution from './StatusDistribution';
import PriorityDistribution from './PriorityDistribution';
import DashboardHeatmapLoader from './DashboardHeatmapLoader';
import ResolutionFunnel from './ResolutionFunnel';
import RecentReportsFeed from './RecentReportsFeed';
import type {
  DashboardKPIs,
  TimeRange,
  TrendDataSets,
  CategoryBreakdownItem,
  StatusDistributionItem,
  PriorityDistributionItem,
  HeatmapPoint,
  FunnelStage,
  AnalyticsRecentReport,
} from '@/db/queries/analytics';

interface DashboardGridProps {
  kpis: DashboardKPIs;
  trendData: TrendDataSets;
  categoryData: CategoryBreakdownItem[];
  statusData: StatusDistributionItem[];
  priorityData: PriorityDistributionItem[];
  heatmapPoints: HeatmapPoint[];
  funnelData: FunnelStage[];
  recentReports: AnalyticsRecentReport[];
  range: TimeRange;
  councilSlug?: string;
  postcode?: string;
}

export default function DashboardGrid({
  kpis,
  trendData,
  categoryData,
  statusData,
  priorityData,
  heatmapPoints,
  funnelData,
  recentReports,
  range,
  councilSlug,
  postcode,
}: DashboardGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-6 lg:grid-cols-12 lg:gap-6 [&>div]:min-w-0">
      {/* KPI Summary Cards — full width */}
      <div className="lg:col-span-12 md:col-span-6">
        <KpiCards data={kpis} range={range} />
      </div>

      {/* Trend Chart — 8 columns on desktop */}
      <div className="lg:col-span-8 md:col-span-6">
        <TrendChart data={trendData} range={range} />
      </div>

      {/* Category Breakdown — 4 columns on desktop */}
      <div className="lg:col-span-4 md:col-span-6">
        <CategoryBreakdown data={categoryData} />
      </div>

      {/* Status Distribution — 6 columns on desktop */}
      <div className="lg:col-span-6 md:col-span-6">
        <StatusDistribution data={statusData} />
      </div>

      {/* Priority Distribution — 6 columns on desktop */}
      <div className="lg:col-span-6 md:col-span-6">
        <PriorityDistribution data={priorityData} />
      </div>

      {/* Geographic Heatmap — full width */}
      <div className="lg:col-span-12 md:col-span-6">
        <DashboardHeatmapLoader points={heatmapPoints} councilSlug={councilSlug} postcode={postcode} />
      </div>

      {/* Resolution Funnel — full width */}
      <div className="lg:col-span-12 md:col-span-6">
        <ResolutionFunnel data={funnelData} />
      </div>

      {/* Recent Reports Feed — full width */}
      <div className="lg:col-span-12 md:col-span-6">
        <RecentReportsFeed data={recentReports} />
      </div>
    </div>
  );
}
