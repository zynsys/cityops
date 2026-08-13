import { prisma } from "@/lib/prisma";

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
}

/**
 * Returns the active tenant whose boundary polygon contains the given point,
 * or null if no boundary match is found.
 *
 * Uses PostGIS ST_Within for containment check. When multiple tenant boundaries
 * overlap at the same point, the oldest active tenant (lowest createdAt) wins.
 */
export async function getTenantByPoint(
  lat: number,
  lng: number
): Promise<TenantSummary | null> {
  const rows = await prisma.$queryRaw<TenantSummary[]>`
    SELECT
      t.id,
      t.name,
      t.slug
    FROM tenant_boundary tb
    JOIN tenant t ON t.id = tb.tenant_id
    WHERE t.status = 'active'
      AND t.deleted_at IS NULL
      AND ST_Within(
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
        tb.boundary::geometry
      )
    ORDER BY t.created_at ASC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

/**
 * Returns all active tenants for use in manual council selection dropdowns.
 */
export async function getActiveTenants(): Promise<TenantSummary[]> {
  return prisma.tenant.findMany({
    where: { status: "active", deletedAt: null },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Returns active council tenants for public-facing dropdowns.
 * Excludes the platform pseudo-tenant (slug = "platform").
 */
export async function getPublicTenants(): Promise<TenantSummary[]> {
  return prisma.tenant.findMany({
    where: { status: "active", deletedAt: null, slug: { not: "platform" } },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Returns a single tenant by ID (for staff portal context bar).
 */
export async function getTenantById(id: string): Promise<TenantSummary | null> {
  return prisma.tenant.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
}
