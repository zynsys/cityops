import { prisma } from "@/lib/prisma";
import type { CreateReportInput } from "@/lib/validations/reports";

interface CreateReportParams extends CreateReportInput {
  reporterUserId: string;
}

export interface FileEntry {
  file: File;
  /** Pre-generated UUID-based filename, e.g. "a1b2c3d4.jpg" */
  storageName: string;
}

export interface CreatedReport {
  id: number;
  title: string;
  status: string;
}

/**
 * Atomically creates a Report, its ReportAttachment records, and the first
 * ReportActivity entry in a single Prisma transaction.
 *
 * The `locationPoint` PostGIS field cannot be written by Prisma directly
 * (Unsupported type), so it is set via `$executeRaw` after the initial insert.
 */
export async function createReport(
  params: CreateReportParams,
  fileEntries: FileEntry[]
): Promise<CreatedReport> {
  return prisma.$transaction(async (tx) => {
    // 1. Create the Report row (locationPoint written in step 2 via raw SQL)
    //    Status starts as 'under_validation' — AI service (F-75) will update it
    const report = await tx.report.create({
      data: {
        tenantId: params.tenantId,
        categoryId: params.categoryId,
        reporterUserId: params.reporterUserId,
        title: params.title,
        description: params.description,
        locationText: params.locationText ?? null,
        status: "under_validation",
      },
      select: { id: true, title: true, status: true },
    });

    // 2. Set the PostGIS geography point via raw SQL (lng, lat order for ST_MakePoint)
    await tx.$executeRaw`
      UPDATE report
      SET location_point = ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)
      WHERE id = ${report.id}
    `;

    // 3. Create ReportAttachment records (one per uploaded file)
    if (fileEntries.length > 0) {
      await tx.reportAttachment.createMany({
        data: fileEntries.map(({ file, storageName }) => ({
          tenantId: params.tenantId,
          reportId: report.id,
          uploadedByUserId: params.reporterUserId,
          type: "image" as const,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          storagePath: `/uploads/${report.id}/${storageName}`,
        })),
      });
    }

    // 4. Write the first ReportActivity entry
    await tx.reportActivity.create({
      data: {
        tenantId: params.tenantId,
        reportId: report.id,
        userId: params.reporterUserId,
        action: "created",
        metadata: { title: params.title, categoryId: params.categoryId },
      },
    });

    return { id: report.id, title: report.title, status: report.status as string };
  });
}
