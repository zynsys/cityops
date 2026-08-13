import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { ReportStatus, ReportPriority } from "@/generated/prisma/enums";

export interface StaffReportFilters {
  status?: ReportStatus;
  categoryId?: string;
  priority?: ReportPriority;
  search?: string;
  sort?: "newest" | "oldest" | "updated" | "priority";
}

export interface StaffReportRow {
  id: number;
  title: string;
  status: ReportStatus;
  priority: ReportPriority | null;
  category: { name: string; color: string | null };
  reporter: { displayName: string };
  assignedUser: { displayName: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffReportsResult {
  reports: StaffReportRow[];
  total: number;
}

const PAGE_SIZE = 25;

export async function getStaffReports(
  tenantId: string,
  filters: StaffReportFilters,
  page: number
): Promise<StaffReportsResult> {
  const where: Prisma.ReportWhereInput = {
    tenantId,
    deletedAt: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { category: { name: { contains: filters.search, mode: "insensitive" } } },
            { reporter: { displayName: { contains: filters.search, mode: "insensitive" } } },
            { assignedUser: { displayName: { contains: filters.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const orderBy = (() => {
    switch (filters.sort) {
      case "oldest":
        return { createdAt: "asc" as const };
      case "updated":
        return { updatedAt: "desc" as const };
      case "priority":
        // Prisma doesn't support enum ordering natively; fallback to updatedAt
        return { updatedAt: "desc" as const };
      default:
        return { createdAt: "desc" as const };
    }
  })();

  const skip = (Math.max(1, page) - 1) * PAGE_SIZE;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy,
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { name: true, color: true } },
        reporter: { select: { displayName: true } },
        assignedUser: { select: { displayName: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return { reports, total };
}

// ---------------------------------------------------------------------------
// Report detail (F-54)
// ---------------------------------------------------------------------------

const staffReportDetailInclude = {
  category: { select: { name: true, color: true, slug: true } },
  reporter: { select: { displayName: true, avatarUrl: true } },
  assignedUser: { select: { displayName: true } },
  attachments: { orderBy: { createdAt: "asc" as const } },
  assignments: {
    orderBy: { assignedAt: "desc" as const },
    select: {
      id: true,
      assignedAt: true,
      isCurrent: true,
      assignedTo: { select: { displayName: true } },
      assignedBy: { select: { displayName: true } },
    },
  },
  comments: {
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      body: true,
      isInternal: true,
      createdAt: true,
      user: { select: { displayName: true } },
    },
  },
  activities: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      action: true,
      oldValue: true,
      newValue: true,
      createdAt: true,
      user: { select: { displayName: true } },
    },
  },
  aiValidationResults: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      outcome: true,
      confidenceScore: true,
      reasonCodes: true,
      reasonText: true,
      modelVersion: true,
      reviewedAt: true,
      reviewOutcome: true,
      reviewedBy: { select: { displayName: true } },
    },
  },
  sourceDuplicates: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      createdAt: true,
      targetReport: { select: { id: true, title: true, status: true } },
    },
  },
  targetDuplicates: {
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      createdAt: true,
      sourceReport: { select: { id: true, title: true, status: true } },
    },
  },
} satisfies Prisma.ReportInclude;

export type StaffReportDetail = Prisma.ReportGetPayload<{
  include: typeof staffReportDetailInclude;
}> & { coordinates: { latitude: number; longitude: number } | null };

export async function getStaffReportDetail(
  reportId: number,
  tenantId: string,
  isPlatformAdmin: boolean
): Promise<StaffReportDetail | null> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: staffReportDetailInclude,
  });

  if (!report || report.deletedAt) return null;
  if (!isPlatformAdmin && report.tenantId !== tenantId) return null;

  const coords = await prisma.$queryRaw<{ latitude: number; longitude: number }[]>`
    SELECT
      ST_Y(location_point::geometry) AS latitude,
      ST_X(location_point::geometry) AS longitude
    FROM report
    WHERE id = ${reportId}
      AND location_point IS NOT NULL
  `;

  return { ...report, coordinates: coords.length > 0 ? coords[0] : null };
}
