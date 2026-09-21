import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

export type TimeRange = '7d' | '30d' | '90d' | '12m' | 'all';

export interface DashboardFilters {
  range: TimeRange;
  councilSlug?: string;
  postcode?: string;
}

export interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

export async function getTenants(): Promise<TenantOption[]> {
  try {
    return await prisma.tenant.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  } catch {
    return [];
  }
}

export function getDateRangeFromFilter(range: TimeRange): Date | null {
  if (range === 'all') return null;

  const now = new Date();

  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '12m':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  }
}

export function parseRange(value: string | undefined): TimeRange {
  const valid: TimeRange[] = ['7d', '30d', '90d', '12m', 'all'];
  return valid.includes(value as TimeRange) ? (value as TimeRange) : '7d';
}

// ---------------------------------------------------------------------------
// KPI Summary Cards (F-16)
// ---------------------------------------------------------------------------

export interface DashboardKPIs {
  reportsSubmitted: number;
  reportsResolved: number;
  avgResolutionDays: number | null;
  activeReports: number;
  trends: {
    reportsSubmitted: number | null;
    reportsResolved: number | null;
    avgResolutionDays: number | null;
  };
}

function getRangeMs(range: TimeRange): number | null {
  switch (range) {
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return 30 * 24 * 60 * 60 * 1000;
    case '90d':
      return 90 * 24 * 60 * 60 * 1000;
    case '12m':
      return 365 * 24 * 60 * 60 * 1000;
    case 'all':
      return null;
  }
}

function calcTrend(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getDashboardKPIs(filters: DashboardFilters): Promise<DashboardKPIs> {
  try {
    const now = new Date();
    const rangeMs = getRangeMs(filters.range);
    const startDate = rangeMs ? new Date(now.getTime() - rangeMs) : null;
    const priorStart = rangeMs ? new Date(now.getTime() - rangeMs * 2) : null;

    const tenantWhere = filters.councilSlug ? { tenant: { slug: filters.councilSlug } } : {};

    const postcodeWhere = filters.postcode
      ? { locationText: { contains: filters.postcode, mode: 'insensitive' as const } }
      : {};

    const deletedFilter = { deletedAt: null };

    // Current period counts
    const createdWhere = {
      ...deletedFilter,
      ...tenantWhere,
      ...postcodeWhere,
      ...(startDate ? { createdAt: { gte: startDate } } : {}),
    };

    const resolvedWhere = {
      ...deletedFilter,
      ...tenantWhere,
      ...postcodeWhere,
      ...(startDate ? { resolvedAt: { gte: startDate } } : { resolvedAt: { not: null } }),
    };

    const [reportsSubmitted, reportsResolved, activeReports] = await Promise.all([
      prisma.report.count({ where: createdWhere }),
      prisma.report.count({ where: resolvedWhere }),
      prisma.report.count({
        where: {
          ...deletedFilter,
          ...tenantWhere,
          ...postcodeWhere,
          status: { notIn: ['resolved', 'closed', 'invalid'] },
        },
      }),
    ]);

    // Avg resolution time (current period)
    const resolvedReports = await prisma.report.findMany({
      where: resolvedWhere,
      select: { createdAt: true, resolvedAt: true },
    });

    let avgResolutionDays: number | null = null;
    if (resolvedReports.length > 0) {
      const totalDays = resolvedReports.reduce((sum, report) => {
        const resolved = report.resolvedAt!.getTime();
        const created = report.createdAt.getTime();
        return sum + (resolved - created) / (1000 * 60 * 60 * 24);
      }, 0);
      avgResolutionDays = Math.round((totalDays / resolvedReports.length) * 10) / 10;
    }

    // Prior period (for trends)
    const trends: DashboardKPIs['trends'] = {
      reportsSubmitted: null,
      reportsResolved: null,
      avgResolutionDays: null,
    };

    if (priorStart && startDate) {
      const priorCreatedWhere = {
        ...deletedFilter,
        ...tenantWhere,
        ...postcodeWhere,
        createdAt: { gte: priorStart, lt: startDate },
      };

      const priorResolvedWhere = {
        ...deletedFilter,
        ...tenantWhere,
        ...postcodeWhere,
        resolvedAt: { gte: priorStart, lt: startDate },
      };

      const [priorReported, priorResolved] = await Promise.all([
        prisma.report.count({ where: priorCreatedWhere }),
        prisma.report.count({ where: priorResolvedWhere }),
      ]);

      trends.reportsSubmitted = calcTrend(reportsSubmitted, priorReported);
      trends.reportsResolved = calcTrend(reportsResolved, priorResolved);

      // Prior avg resolution time
      const priorResolvedReports = await prisma.report.findMany({
        where: priorResolvedWhere,
        select: { createdAt: true, resolvedAt: true },
      });

      if (priorResolvedReports.length > 0) {
        const priorTotalDays = priorResolvedReports.reduce((sum, report) => {
          const resolved = report.resolvedAt!.getTime();
          const created = report.createdAt.getTime();
          return sum + (resolved - created) / (1000 * 60 * 60 * 24);
        }, 0);
        const priorAvg = Math.round((priorTotalDays / priorResolvedReports.length) * 10) / 10;
        if (avgResolutionDays !== null) {
          trends.avgResolutionDays = calcTrend(avgResolutionDays, priorAvg);
        }
      }
    }

    return { reportsSubmitted, reportsResolved, avgResolutionDays, activeReports, trends };
  } catch {
    return {
      reportsSubmitted: 0,
      reportsResolved: 0,
      avgResolutionDays: null,
      activeReports: 0,
      trends: {
        reportsSubmitted: null,
        reportsResolved: null,
        avgResolutionDays: null,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Trend Chart (F-17)
// ---------------------------------------------------------------------------

export interface TrendDataPoint {
  date: string;
  reported: number;
  resolved: number;
}

export interface TrendDataSets {
  daily: TrendDataPoint[];
  weekly: TrendDataPoint[];
  monthly: TrendDataPoint[];
}

async function fetchTrendBucket(
  trunc: 'day' | 'week' | 'month',
  startDate: Date | null,
  councilSlug?: string,
  postcode?: string,
): Promise<TrendDataPoint[]> {
  const conditions: Prisma.Sql[] = [Prisma.sql`i.deleted_at IS NULL`];

  if (startDate) {
    conditions.push(Prisma.sql`i.created_at >= ${startDate}`);
  }

  if (councilSlug) {
    conditions.push(Prisma.sql`t.slug = ${councilSlug}`);
  }

  if (postcode) {
    const likePattern = `%${postcode}%`;
    conditions.push(Prisma.sql`i.location_text ILIKE ${likePattern}`);
  }

  const whereClause = Prisma.join(conditions, ' AND ');

  // trunc is a fixed enum value (day/week/month), not user input — safe to interpolate
  const truncSql =
    trunc === 'day'
      ? Prisma.sql`date_trunc('day', i.created_at)`
      : trunc === 'week'
        ? Prisma.sql`date_trunc('week', i.created_at)`
        : Prisma.sql`date_trunc('month', i.created_at)`;

  const rows = await prisma.$queryRaw<{ bucket: Date; reported: bigint; resolved: bigint }[]>`
    SELECT
      ${truncSql} AS bucket,
      COUNT(*)::bigint AS reported,
      COUNT(i.resolved_at)::bigint AS resolved
    FROM report i
    JOIN tenant t ON t.id = i.tenant_id
    WHERE ${whereClause}
    GROUP BY bucket
    ORDER BY bucket
  `;

  return rows.map((r) => ({
    date: r.bucket.toISOString(),
    reported: Number(r.reported),
    resolved: Number(r.resolved),
  }));
}

export async function getTrendData(filters: DashboardFilters): Promise<TrendDataSets> {
  try {
    const startDate = getDateRangeFromFilter(filters.range);

    const [daily, weekly, monthly] = await Promise.all([
      fetchTrendBucket('day', startDate, filters.councilSlug, filters.postcode),
      fetchTrendBucket('week', startDate, filters.councilSlug, filters.postcode),
      fetchTrendBucket('month', startDate, filters.councilSlug, filters.postcode),
    ]);

    return { daily, weekly, monthly };
  } catch {
    return { daily: [], weekly: [], monthly: [] };
  }
}

// ---------------------------------------------------------------------------
// Category Breakdown (F-18)
// ---------------------------------------------------------------------------

export interface CategoryBreakdownItem {
  slug: string;
  name: string;
  color: string | null;
  count: number;
}

export async function getCategoryBreakdown(filters: DashboardFilters): Promise<CategoryBreakdownItem[]> {
  try {
    const startDate = getDateRangeFromFilter(filters.range);

    const tenantWhere = filters.councilSlug ? { tenant: { slug: filters.councilSlug } } : {};

    const reports = await prisma.report.groupBy({
      by: ['categoryId'],
      where: {
        deletedAt: null,
        ...tenantWhere,
        ...(filters.postcode ? { locationText: { contains: filters.postcode, mode: 'insensitive' as const } } : {}),
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    if (reports.length === 0) return [];

    const categories = await prisma.reportCategory.findMany({
      where: { id: { in: reports.map((i) => i.categoryId) } },
      select: { id: true, slug: true, name: true, color: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    // Aggregate by slug to merge same-named categories across tenants
    const slugMap = new Map<string, CategoryBreakdownItem>();
    for (const i of reports) {
      const cat = categoryMap.get(i.categoryId);
      const slug = cat?.slug ?? 'unknown';
      const existing = slugMap.get(slug);
      if (existing) {
        existing.count += i._count.id;
      } else {
        slugMap.set(slug, {
          slug,
          name: cat?.name ?? 'Unknown',
          color: cat?.color ?? null,
          count: i._count.id,
        });
      }
    }

    return Array.from(slugMap.values()).sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Status Distribution (F-19)
// ---------------------------------------------------------------------------

const STATUS_ORDER = [
  'created',
  'under_validation',
  'validated',
  'invalid',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
] as const;

export interface StatusDistributionItem {
  status: string;
  count: number;
}

export async function getStatusDistribution(filters: DashboardFilters): Promise<StatusDistributionItem[]> {
  try {
    const startDate = getDateRangeFromFilter(filters.range);

    const tenantWhere = filters.councilSlug ? { tenant: { slug: filters.councilSlug } } : {};

    const reports = await prisma.report.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
        ...tenantWhere,
        ...(filters.postcode ? { locationText: { contains: filters.postcode, mode: 'insensitive' as const } } : {}),
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      },
      _count: { id: true },
    });

    const countMap = new Map(reports.map((i) => [i.status, i._count.id]));

    return STATUS_ORDER.map((status) => ({
      status,
      count: countMap.get(status) ?? 0,
    }));
  } catch {
    return STATUS_ORDER.map((status) => ({ status, count: 0 }));
  }
}

// ---------------------------------------------------------------------------
// Priority Distribution (F-20)
// ---------------------------------------------------------------------------

const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low', 'unset'] as const;

export interface PriorityDistributionItem {
  priority: string;
  count: number;
}

export async function getPriorityDistribution(filters: DashboardFilters): Promise<PriorityDistributionItem[]> {
  try {
    const startDate = getDateRangeFromFilter(filters.range);

    const tenantWhere = filters.councilSlug ? { tenant: { slug: filters.councilSlug } } : {};

    const reports = await prisma.report.groupBy({
      by: ['priority'],
      where: {
        deletedAt: null,
        ...tenantWhere,
        ...(filters.postcode ? { locationText: { contains: filters.postcode, mode: 'insensitive' as const } } : {}),
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      },
      _count: { id: true },
    });

    const countMap = new Map(reports.map((i) => [i.priority ?? 'unset', i._count.id]));

    return PRIORITY_ORDER.map((priority) => ({
      priority,
      count: countMap.get(priority) ?? 0,
    }));
  } catch {
    return PRIORITY_ORDER.map((priority) => ({ priority, count: 0 }));
  }
}

// ---------------------------------------------------------------------------
// Geographic Heatmap (F-21)
// ---------------------------------------------------------------------------

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

export async function getHeatmapPoints(filters: DashboardFilters): Promise<HeatmapPoint[]> {
  try {
    const startDate = getDateRangeFromFilter(filters.range);

    const conditions: Prisma.Sql[] = [Prisma.sql`i.location_point IS NOT NULL`, Prisma.sql`i.deleted_at IS NULL`];

    if (startDate) {
      conditions.push(Prisma.sql`i.created_at >= ${startDate}`);
    }

    if (filters.councilSlug) {
      conditions.push(Prisma.sql`t.slug = ${filters.councilSlug}`);
    }

    if (filters.postcode) {
      const likePattern = `%${filters.postcode}%`;
      conditions.push(Prisma.sql`i.location_text ILIKE ${likePattern}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    const rows = await prisma.$queryRaw<{ latitude: number; longitude: number }[]>`
      SELECT
        ST_Y(i.location_point::geometry) AS latitude,
        ST_X(i.location_point::geometry) AS longitude
      FROM report i
      JOIN tenant t ON t.id = i.tenant_id
      WHERE ${whereClause}
    `;

    return rows.map((r) => ({
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      intensity: 1.0,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Resolution Funnel (F-22)
// ---------------------------------------------------------------------------

const FUNNEL_STAGES = [
  { stage: 'Created', statuses: null },
  { stage: 'Validated', statuses: ['validated', 'assigned', 'in_progress', 'resolved', 'closed'] },
  { stage: 'Assigned', statuses: ['assigned', 'in_progress', 'resolved', 'closed'] },
  { stage: 'In Progress', statuses: ['in_progress', 'resolved', 'closed'] },
  { stage: 'Resolved', statuses: ['resolved', 'closed'] },
  { stage: 'Closed', statuses: ['closed'] },
] as const;

export interface FunnelStage {
  stage: string;
  count: number;
}

export async function getResolutionFunnel(filters: DashboardFilters): Promise<FunnelStage[]> {
  try {
    const startDate = getDateRangeFromFilter(filters.range);

    const tenantWhere = filters.councilSlug ? { tenant: { slug: filters.councilSlug } } : {};

    const baseWhere = {
      deletedAt: null,
      ...tenantWhere,
      ...(filters.postcode ? { locationText: { contains: filters.postcode, mode: 'insensitive' as const } } : {}),
      ...(startDate ? { createdAt: { gte: startDate } } : {}),
    };

    const counts = await Promise.all(
      FUNNEL_STAGES.map((s) =>
        prisma.report.count({
          where: {
            ...baseWhere,
            ...(s.statuses ? { status: { in: [...s.statuses] } } : {}),
          },
        }),
      ),
    );

    return FUNNEL_STAGES.map((s, i) => ({
      stage: s.stage,
      count: counts[i],
    }));
  } catch {
    return FUNNEL_STAGES.map((s) => ({ stage: s.stage, count: 0 }));
  }
}

// ---------------------------------------------------------------------------
// Recent Reports (public analytics view — replaces activity feed)
// ---------------------------------------------------------------------------

export interface AnalyticsRecentReport {
  id: number;
  title: string;
  status: string;
  locationText: string | null;
  createdAt: Date;
  categoryName: string;
  categorySlug: string;
  categoryColor: string | null;
  tenantName: string;
  reporterName: string | null;
}

export async function getAnalyticsRecentReports(
  councilSlug?: string,
  postcode?: string,
  limit = 15,
): Promise<AnalyticsRecentReport[]> {
  try {
    const conditions: Prisma.Sql[] = [Prisma.sql`i.deleted_at IS NULL`];

    if (councilSlug) {
      conditions.push(Prisma.sql`t.slug = ${councilSlug}`);
    }

    if (postcode) {
      const likePattern = `%${postcode}%`;
      conditions.push(Prisma.sql`i.location_text ILIKE ${likePattern}`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    const rows = await prisma.$queryRaw<
      {
        id: number;
        title: string;
        status: string;
        location_text: string | null;
        created_at: Date;
        category_name: string;
        category_slug: string;
        category_color: string | null;
        tenant_name: string;
        reporter_name: string | null;
      }[]
    >`
      SELECT
        i.id,
        i.title,
        i.status::text,
        i.location_text,
        i.created_at,
        c.name  AS category_name,
        c.slug  AS category_slug,
        c.color AS category_color,
        t.name  AS tenant_name,
        u.display_name AS reporter_name
      FROM report i
      JOIN report_category c ON c.id = i.category_id
      JOIN tenant t           ON t.id = i.tenant_id
      LEFT JOIN "user" u      ON u.id = i.reporter_user_id
      WHERE ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      locationText: r.location_text,
      createdAt: r.created_at,
      categoryName: r.category_name,
      categorySlug: r.category_slug,
      categoryColor: r.category_color,
      tenantName: r.tenant_name,
      reporterName: r.reporter_name,
    }));
  } catch {
    return [];
  }
}
