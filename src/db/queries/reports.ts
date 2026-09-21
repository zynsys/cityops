import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const recentReportsInclude = {
  category: true,
  reporter: true,
  tenant: true,
} satisfies Prisma.ReportInclude;

export type RecentReport = Prisma.ReportGetPayload<{
  include: typeof recentReportsInclude;
}>;

export async function getRecentReports(limit = 8): Promise<RecentReport[]> {
  try {
    return await prisma.report.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: recentReportsInclude,
    });
  } catch {
    return [];
  }
}

export interface MapReport {
  id: number;
  title: string;
  status: string;
  location_text: string | null;
  latitude: number;
  longitude: number;
  category_slug: string;
  category_name: string;
  category_color: string | null;
  tenant_name: string;
  tenant_slug: string;
}

export async function getMapReports(): Promise<MapReport[]> {
  try {
    return await prisma.$queryRaw<MapReport[]>`
      SELECT
        i.id,
        i.title,
        i.status::text,
        i.location_text,
        ST_Y(i.location_point::geometry)  AS latitude,
        ST_X(i.location_point::geometry)  AS longitude,
        c.slug   AS category_slug,
        c.name   AS category_name,
        c.color  AS category_color,
        t.name   AS tenant_name,
        t.slug   AS tenant_slug
      FROM report i
      JOIN report_category c ON c.id = i.category_id
      JOIN tenant t         ON t.id = i.tenant_id
      WHERE i.location_point IS NOT NULL
        AND i.deleted_at IS NULL
      ORDER BY i.created_at DESC
    `;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Report detail (F-14)
// ---------------------------------------------------------------------------

const reportDetailInclude = {
  category: true,
  reporter: { select: { displayName: true, avatarUrl: true } },
  tenant: { select: { name: true, slug: true } },
  attachments: { orderBy: { createdAt: "asc" as const } },
  comments: {
    where: { isInternal: false, deletedAt: null },
    orderBy: { createdAt: "asc" as const },
    include: { user: { select: { displayName: true, avatarUrl: true } } },
  },
  activities: {
    orderBy: { createdAt: "asc" as const },
    include: { user: { select: { displayName: true } } },
  },
  aiValidationResults: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { outcome: true },
  },
} satisfies Prisma.ReportInclude;

export type ReportDetail = Prisma.ReportGetPayload<{
  include: typeof reportDetailInclude;
}>;

export interface ReportCoordinates {
  latitude: number;
  longitude: number;
}

export async function getReportById(
  id: number
): Promise<(ReportDetail & { coordinates: ReportCoordinates | null }) | null> {
  try {
    const report = await prisma.report.findUnique({
      where: { id },
      include: reportDetailInclude,
    });

    if (!report || report.deletedAt) return null;

    // Fetch coordinates via raw SQL (PostGIS)
    const coords = await prisma.$queryRaw<ReportCoordinates[]>`
      SELECT
        ST_Y(location_point::geometry) AS latitude,
        ST_X(location_point::geometry) AS longitude
      FROM report
      WHERE id = ${id}
        AND location_point IS NOT NULL
    `;

    return {
      ...report,
      coordinates: coords.length > 0 ? coords[0] : null,
    };
  } catch (err) {
    console.error(`[getReportById] Failed to load report ${id}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------

export interface PublicReport {
  id: number;
  title: string;
  status: string;
  priority: string | null;
  locationText: string | null;
  createdAt: Date;
  updatedAt: Date;
  latitude: number | null;
  longitude: number | null;
  category_name: string;
  category_slug: string;
  category_color: string | null;
  tenant_name: string;
  tenant_slug: string;
  thumbnailUrl: string | null;
  reporter_name?: string | null;
}

export interface CategoryOption {
  slug: string;
  name: string;
  color: string | null;
}

export interface GetPublicReportsParams {
  council?: string;
  postcode?: string;
  city?: string;
  status?: string;
  categorySlug?: string;
  sort?: "updated_desc" | "created_desc" | "created_asc" | "priority";
  page?: number;
  pageSize?: number;
}

export interface GetPublicReportsResult {
  reports: PublicReport[];
  total: number;
  categories: CategoryOption[];
}

export async function getPublicReports(
  params: GetPublicReportsParams
): Promise<GetPublicReportsResult> {
  const {
    council,
    postcode,
    city,
    status,
    categorySlug,
    sort = "updated_desc",
    page = 1,
    pageSize = 20,
  } = params;

  // Sanitise location inputs (cap length to limit query cost)
  const safeCouncil = council?.trim().slice(0, 100);
  const safePostcode = postcode?.trim().slice(0, 100);
  const safeCity = city?.trim().slice(0, 100);

  const PLATFORM_SLUG = "platform";
  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.max(1, pageSize ?? 20);
  const offset = (safePage - 1) * safePageSize;

  // Build WHERE conditions — always exclude platform pseudo-tenant and soft-deleted
  const conditions: Prisma.Sql[] = [
    Prisma.sql`r.deleted_at IS NULL`,
    Prisma.sql`t.slug != ${PLATFORM_SLUG}`,
  ];

  if (safeCouncil) {
    conditions.push(Prisma.sql`t.slug = ${safeCouncil}`);
  } else if (safePostcode) {
    conditions.push(Prisma.sql`r.location_text ILIKE ${"%" + safePostcode + "%"}`);
  } else if (safeCity) {
    conditions.push(Prisma.sql`r.location_text ILIKE ${"%" + safeCity + "%"}`);
  }
  // No location param = all councils (no extra condition needed)

  if (status) {
    const safeStatus = status.slice(0, 50);
    conditions.push(Prisma.sql`r.status::text = ${safeStatus}`);
  }

  if (categorySlug) {
    const safeCategorySlug = categorySlug.slice(0, 100);
    conditions.push(Prisma.sql`c.slug = ${safeCategorySlug}`);
  }

  const whereClause = Prisma.join(conditions, " AND ");

  // Location-only where clause for the categories dropdown (ignores status/category filters)
  const locationConditions: Prisma.Sql[] = [
    Prisma.sql`r.deleted_at IS NULL`,
    Prisma.sql`t.slug != ${PLATFORM_SLUG}`,
  ];
  if (safeCouncil) {
    locationConditions.push(Prisma.sql`t.slug = ${safeCouncil}`);
  } else if (safePostcode) {
    locationConditions.push(
      Prisma.sql`r.location_text ILIKE ${"%" + safePostcode + "%"}`
    );
  } else if (safeCity) {
    locationConditions.push(
      Prisma.sql`r.location_text ILIKE ${"%" + safeCity + "%"}`
    );
  }
  const locationWhereClause = Prisma.join(locationConditions, " AND ");

  const orderByClause = (() => {
    switch (sort) {
      case "created_desc":
        return Prisma.sql`r.created_at DESC`;
      case "created_asc":
        return Prisma.sql`r.created_at ASC`;
      case "priority":
        return Prisma.sql`CASE r.priority::text WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END ASC, r.created_at DESC`;
      default:
        return Prisma.sql`r.updated_at DESC`;
    }
  })();

  try {
    const [rows, countResult, categoryRows] = await Promise.all([
      prisma.$queryRaw<PublicReport[]>`
        SELECT
          r.id,
          r.title,
          r.status::text                           AS status,
          r.priority::text                         AS priority,
          r.location_text                          AS "locationText",
          r.created_at                             AS "createdAt",
          r.updated_at                             AS "updatedAt",
          ST_Y(r.location_point::geometry)         AS latitude,
          ST_X(r.location_point::geometry)         AS longitude,
          c.name                                   AS category_name,
          c.slug                                   AS category_slug,
          c.color                                  AS category_color,
          t.name                                   AS tenant_name,
          t.slug                                   AS tenant_slug,
          att.storage_path                         AS "thumbnailUrl",
          u.display_name                           AS reporter_name
        FROM report r
        JOIN report_category c ON c.id = r.category_id
        JOIN tenant t          ON t.id = r.tenant_id
        LEFT JOIN "user" u     ON u.id = r.reporter_user_id
        LEFT JOIN LATERAL (
          SELECT storage_path
          FROM   report_attachment
          WHERE  report_id = r.id
            AND  type = 'image'
          ORDER  BY created_at ASC
          LIMIT  1
        ) att ON true
        WHERE ${whereClause}
        ORDER BY ${orderByClause}
        LIMIT  ${safePageSize}
        OFFSET ${offset}
      `,
      prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(*)::bigint AS total
        FROM  report r
        JOIN  report_category c ON c.id = r.category_id
        JOIN  tenant t          ON t.id = r.tenant_id
        WHERE ${whereClause}
      `,
      prisma.$queryRaw<CategoryOption[]>`
        SELECT DISTINCT c.slug, c.name, c.color
        FROM  report r
        JOIN  report_category c ON c.id = r.category_id
        JOIN  tenant t          ON t.id = r.tenant_id
        WHERE ${locationWhereClause}
        ORDER BY c.name ASC
      `,
    ]);

    return {
      reports: rows,
      total: Number(countResult[0]?.total ?? 0),
      categories: categoryRows,
    };
  } catch {
    return { reports: [], total: 0, categories: [] };
  }
}

/**
 * Returns all categories that have at least one report across all public councils.
 * Used to populate the category filter dropdown globally (not location-scoped).
 */
export async function getPublicCategories(): Promise<CategoryOption[]> {
  try {
    const PLATFORM_SLUG = "platform";
    return await prisma.$queryRaw<CategoryOption[]>`
      SELECT DISTINCT c.slug, c.name, c.color
      FROM  report r
      JOIN  report_category c ON c.id = r.category_id
      JOIN  tenant t          ON t.id = r.tenant_id
      WHERE r.deleted_at IS NULL
        AND t.slug != ${PLATFORM_SLUG}
      ORDER BY c.name ASC
    `;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// My Reports (F-49)
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

export interface MyReportSummary {
  id: number;
  title: string;
  status: string;
  priority: string | null;
  locationText: string | null;
  createdAt: Date;
  updatedAt: Date;
  latitude: number | null;
  longitude: number | null;
  categoryName: string;
  categorySlug: string;
  categoryColor: string | null;
  tenantName: string;
  thumbnailUrl: string | null;
}

export interface GetMyReportsParams {
  status?: string;
  categorySlug?: string;
  tenantSlug?: string;
  postcode?: string;
  city?: string;
  sort?: "created_desc" | "updated_desc" | "created_asc" | "priority";
}

export interface TenantOption {
  slug: string;
  name: string;
}

export interface MyReportsResult {
  reports: MyReportSummary[];
  total: number;
  categories: CategoryOption[];
}

export async function getMyReports(
  userId: string,
  page: number,
  params: GetMyReportsParams = {}
): Promise<MyReportsResult> {
  const { status, categorySlug, tenantSlug, postcode, city, sort = "created_desc" } = params;
  const safePageSize = PAGE_SIZE;
  const skip = (Math.max(1, page) - 1) * safePageSize;
  const safePostcode = postcode?.trim().slice(0, 100);
  const safeCity = city?.trim().slice(0, 100);

  const baseConditions: Prisma.Sql[] = [
    Prisma.sql`r.reporter_user_id = CAST(${userId} AS UUID)`,
    Prisma.sql`r.deleted_at IS NULL`,
  ];

  const conditions: Prisma.Sql[] = [...baseConditions];
  if (status) conditions.push(Prisma.sql`r.status::text = ${status.slice(0, 50)}`);
  if (categorySlug) conditions.push(Prisma.sql`c.slug = ${categorySlug.slice(0, 100)}`);
  if (tenantSlug) conditions.push(Prisma.sql`t.slug = ${tenantSlug.slice(0, 100)}`);
  else if (safePostcode) conditions.push(Prisma.sql`r.location_text ILIKE ${safePostcode + "%"}`);
  else if (safeCity) conditions.push(Prisma.sql`r.location_text ILIKE ${"%" + safeCity + "%"}`);

  const whereClause = Prisma.join(conditions, " AND ");
  const baseWhere = Prisma.join(baseConditions, " AND ");

  const orderByClause = (() => {
    switch (sort) {
      case "updated_desc": return Prisma.sql`r.updated_at DESC`;
      case "created_asc":  return Prisma.sql`r.created_at ASC`;
      case "priority":     return Prisma.sql`CASE r.priority::text WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END ASC, r.created_at DESC`;
      default:             return Prisma.sql`r.created_at DESC`;
    }
  })();

  try {
    const [rows, countResult, categoryRows] = await Promise.all([
      prisma.$queryRaw<MyReportSummary[]>`
        SELECT
          r.id,
          r.title,
          r.status::text                          AS status,
          r.priority::text                        AS priority,
          r.location_text                         AS "locationText",
          r.created_at                            AS "createdAt",
          r.updated_at                            AS "updatedAt",
          ST_Y(r.location_point::geometry)        AS latitude,
          ST_X(r.location_point::geometry)        AS longitude,
          c.name                                  AS "categoryName",
          c.slug                                  AS "categorySlug",
          c.color                                 AS "categoryColor",
          t.name                                  AS "tenantName",
          att.storage_path                        AS "thumbnailUrl"
        FROM report r
        JOIN report_category c ON c.id = r.category_id
        JOIN tenant t          ON t.id = r.tenant_id
        LEFT JOIN LATERAL (
          SELECT storage_path
          FROM   report_attachment
          WHERE  report_id = r.id
            AND  type = 'image'
          ORDER  BY created_at ASC
          LIMIT  1
        ) att ON true
        WHERE ${whereClause}
        ORDER BY ${orderByClause}
        LIMIT  ${safePageSize}
        OFFSET ${skip}
      `,
      prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COUNT(*)::bigint AS total
        FROM report r
        JOIN report_category c ON c.id = r.category_id
        JOIN tenant t          ON t.id = r.tenant_id
        WHERE ${whereClause}
      `,
      prisma.$queryRaw<CategoryOption[]>`
        SELECT DISTINCT c.slug, c.name, c.color
        FROM report r
        JOIN report_category c ON c.id = r.category_id
        WHERE ${baseWhere}
        ORDER BY c.name ASC
      `,
    ]);

    return {
      reports: rows,
      total: Number(countResult[0]?.total ?? 0),
      categories: categoryRows,
    };
  } catch {
    return { reports: [], total: 0, categories: [] };
  }
}

// ---------------------------------------------------------------------------
// Similar Reports (F-77)
// ---------------------------------------------------------------------------

export interface SimilarReport {
  id: number;
  title: string;
  status: string;
  categoryName: string;
  categoryColor: string;
  locationText: string | null;
  distanceMetres: number;
  createdAt: string; // ISO 8601
  score: number;
}

export interface GetSimilarReportsParams {
  lat: number;
  lng: number;
  categoryId: string;
  title: string;
  tenantId?: string;
  radiusMetres?: number;
}

interface SimilarReportRaw {
  id: number;
  title: string;
  status: string;
  category_name: string;
  category_color: string | null;
  location_text: string | null;
  distance_metres: number;
  created_at: Date;
  score: number;
}

const SIMILAR_MAX_RADIUS = 2000;
const SIMILAR_DEFAULT_RADIUS = 500;
const SIMILAR_SCORE_THRESHOLD = 0.25;
const SIMILAR_MAX_RESULTS = 3;

export async function getSimilarReports(
  params: GetSimilarReportsParams
): Promise<SimilarReport[]> {
  const {
    lat,
    lng,
    categoryId,
    title,
    tenantId,
    radiusMetres = SIMILAR_DEFAULT_RADIUS,
  } = params;

  const safeRadius = Math.min(radiusMetres, SIMILAR_MAX_RADIUS);

  const conditions: Prisma.Sql[] = [
    Prisma.sql`r.deleted_at IS NULL`,
    Prisma.sql`r.location_point IS NOT NULL`,
    // Includes under_validation so reports still pending review (incl. ones the AI itself
    // already flagged as duplicate_suspected) still surface as candidates before submission.
    Prisma.sql`r.status::text IN ('under_validation', 'validated', 'assigned', 'in_progress')`,
    Prisma.sql`ST_DWithin(
      r.location_point,
      ST_SetSRID(ST_Point(${lng}::float8, ${lat}::float8), 4326)::geography,
      ${safeRadius}::float8
    )`,
  ];

  if (tenantId) {
    conditions.push(Prisma.sql`r.tenant_id = ${tenantId}::uuid`);
  }

  const whereClause = Prisma.join(conditions, " AND ");

  try {
    const rows = await prisma.$queryRaw<SimilarReportRaw[]>`
      WITH candidates AS (
        SELECT
          r.id,
          r.title,
          r.status::text                                                                AS status,
          rc.name                                                                       AS category_name,
          rc.color                                                                      AS category_color,
          r.location_text,
          ST_Distance(
            r.location_point,
            ST_SetSRID(ST_Point(${lng}::float8, ${lat}::float8), 4326)::geography
          )                                                                             AS distance_metres,
          r.created_at,
          (
            CASE WHEN r.category_id = ${categoryId}::uuid THEN 0.4 ELSE 0.0 END
            + ts_rank(
                to_tsvector('english', r.title || ' ' || r.description),
                plainto_tsquery('english', ${title})
              ) * 0.4
            + (
                1.0 - LEAST(
                  ST_Distance(
                    r.location_point,
                    ST_SetSRID(ST_Point(${lng}::float8, ${lat}::float8), 4326)::geography
                  ) / NULLIF(${safeRadius}::float8, 0),
                  1.0
                )
              ) * 0.2
          )                                                                             AS score
        FROM report r
        JOIN report_category rc ON rc.id = r.category_id
        WHERE ${whereClause}
      )
      SELECT * FROM candidates
      WHERE score >= ${SIMILAR_SCORE_THRESHOLD}
      ORDER BY score DESC
      LIMIT ${SIMILAR_MAX_RESULTS}
    `;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      categoryName: r.category_name,
      categoryColor: r.category_color ?? "#6B7280",
      locationText: r.location_text,
      distanceMetres: Number(r.distance_metres),
      createdAt: r.created_at.toISOString(),
      score: Number(r.score),
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Report for Edit (F-86)
// ---------------------------------------------------------------------------

export interface ReportForEdit {
  id: number;
  reporterUserId: string;
  tenantId: string;
  categoryId: string;
  title: string;
  description: string;
  status: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  attachments: { id: string; storagePath: string; fileName: string }[];
}

export async function getReportForEdit(id: number): Promise<ReportForEdit | null> {
  try {
    const report = await prisma.report.findUnique({
      where: { id },
      select: {
        id: true,
        reporterUserId: true,
        tenantId: true,
        categoryId: true,
        title: true,
        description: true,
        status: true,
        locationText: true,
        deletedAt: true,
        attachments: {
          where: { type: "image" },
          orderBy: { createdAt: "asc" },
          select: { id: true, storagePath: true, fileName: true },
        },
      },
    });

    if (!report || report.deletedAt) return null;

    const coords = await prisma.$queryRaw<{ latitude: number; longitude: number }[]>`
      SELECT
        ST_Y(location_point::geometry) AS latitude,
        ST_X(location_point::geometry) AS longitude
      FROM report
      WHERE id = ${id}
        AND location_point IS NOT NULL
    `;

    return {
      id: report.id,
      reporterUserId: report.reporterUserId,
      tenantId: report.tenantId,
      categoryId: report.categoryId,
      title: report.title,
      description: report.description,
      status: report.status as string,
      locationText: report.locationText,
      lat: coords[0]?.latitude ?? null,
      lng: coords[0]?.longitude ?? null,
      attachments: report.attachments,
    };
  } catch {
    return null;
  }
}
