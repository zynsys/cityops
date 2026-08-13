import { NextRequest, NextResponse } from "next/server";
import { extname } from "path";
import { auth } from "@auth";
import { prisma } from "@/lib/prisma";
import { editReportSchema } from "@/lib/validations/reports";
import { uploadAttachment, deleteAttachment } from "@/lib/storage";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_TOTAL_ATTACHMENTS = 5;

const EDITABLE_STATUSES = new Set(["created", "under_validation"]);

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  // 1. Auth
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const reportId = parseInt(idStr, 10);
  if (isNaN(reportId) || reportId < 1) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  // 2. Load report
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      reporterUserId: true,
      tenantId: true,
      status: true,
      deletedAt: true,
      attachments: {
        select: { id: true, storagePath: true },
      },
    },
  });

  if (!report || report.deletedAt) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // 3. Ownership guard
  if (report.reporterUserId !== session.user.userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 4. Editable status guard
  if (!EDITABLE_STATUSES.has(report.status as string)) {
    return NextResponse.json({ error: "report_not_editable" }, { status: 409 });
  }

  // 5. Parse form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const dataRaw = formData.get("data");
  if (typeof dataRaw !== "string") {
    return NextResponse.json({ error: "missing_data_field" }, { status: 400 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(dataRaw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = editReportSchema.safeParse(parsedBody);
  if (!result.success) {
    return NextResponse.json(
      { error: "validation_error", details: result.error.issues },
      { status: 400 }
    );
  }

  const {
    categoryId,
    title,
    description,
    locationText,
    lat,
    lng,
    removeAttachmentIds = [],
  } = result.data;

  // 6. Validate removeAttachmentIds belong to this report
  const reportAttachmentIds = new Set(report.attachments.map((a) => a.id));
  for (const aId of removeAttachmentIds) {
    if (!reportAttachmentIds.has(aId)) {
      return NextResponse.json(
        { error: "invalid_attachment_id", id: aId },
        { status: 400 }
      );
    }
  }

  // 7. Validate new files
  const newFiles = formData
    .getAll("attachments[]")
    .filter((f): f is File => f instanceof File);

  for (const file of newFiles) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "validation_error", details: [`File type "${file.type}" is not allowed.`] },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "validation_error", details: [`File "${file.name}" exceeds the 10 MB size limit.`] },
        { status: 400 }
      );
    }
  }

  const remainingExisting = report.attachments.length - removeAttachmentIds.length;
  if (remainingExisting + newFiles.length > MAX_TOTAL_ATTACHMENTS) {
    return NextResponse.json(
      { error: "validation_error", details: [`Maximum ${MAX_TOTAL_ATTACHMENTS} photos allowed.`] },
      { status: 400 }
    );
  }

  // 8. Upload new files before DB transaction (idempotent, orphaned if TX fails)
  interface NewFileEntry {
    file: File;
    storageName: string;
    storagePath: string;
  }

  const newFileEntries: NewFileEntry[] = newFiles.map((file) => {
    const ext = extname(file.name).toLowerCase() || ".bin";
    const storageName = `${crypto.randomUUID()}${ext}`;
    return { file, storageName, storagePath: `/uploads/${reportId}/${storageName}` };
  });

  try {
    await Promise.all(
      newFileEntries.map(({ file, storageName }) =>
        uploadAttachment(file, reportId, storageName)
      )
    );
  } catch (uploadErr) {
    console.error(`[PATCH /api/reports/${reportId}] Upload failed:`, uploadErr);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  // 9. Determine which fields changed (for activity log)
  const currentReport = await prisma.report.findUnique({
    where: { id: reportId },
    select: { title: true, description: true, categoryId: true, locationText: true },
  });

  const changedFields: string[] = [];
  if (currentReport) {
    if (title !== currentReport.title) changedFields.push("title");
    if (description !== currentReport.description) changedFields.push("description");
    if (categoryId !== currentReport.categoryId) changedFields.push("category");
    if ((locationText ?? null) !== currentReport.locationText) changedFields.push("location");
  }
  if (removeAttachmentIds.length > 0) changedFields.push("photos_removed");
  if (newFiles.length > 0) changedFields.push("photos_added");

  // 10. DB transaction: update report + manage attachments + write activity log
  const pathsToDelete = report.attachments
    .filter((a) => removeAttachmentIds.includes(a.id))
    .map((a) => a.storagePath);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // a. Update report fields
      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: {
          categoryId,
          title,
          description,
          locationText: locationText ?? null,
        },
        select: { id: true, title: true, status: true },
      });

      // b. Update PostGIS location point
      await tx.$executeRaw`
        UPDATE report
        SET location_point = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
        WHERE id = ${reportId}
      `;

      // c. Delete removed attachments from DB
      if (removeAttachmentIds.length > 0) {
        await tx.reportAttachment.deleteMany({
          where: { id: { in: removeAttachmentIds }, reportId },
        });
      }

      // d. Create new attachment records
      if (newFileEntries.length > 0) {
        await tx.reportAttachment.createMany({
          data: newFileEntries.map(({ file, storageName }) => ({
            tenantId: report.tenantId,
            reportId,
            uploadedByUserId: session.user.userId,
            type: "image" as const,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            storagePath: `/uploads/${reportId}/${storageName}`,
          })),
        });
      }

      // e. Write activity log via raw SQL to avoid stale enum registry in the
      //    dev server's hot-reloaded Prisma singleton (safe in production too)
      await tx.$executeRaw`
        INSERT INTO report_activity (tenant_id, report_id, user_id, action, metadata)
        VALUES (
          ${report.tenantId}::uuid,
          ${reportId},
          ${session.user.userId}::uuid,
          'edited'::"ActivityAction",
          ${JSON.stringify({ changedFields })}::jsonb
        )
      `;

      return updatedReport;
    });

    // 11. Delete physical files after successful TX (best-effort)
    await Promise.allSettled(pathsToDelete.map(deleteAttachment));

    return NextResponse.json({
      report: { id: updated.id, title: updated.title, status: updated.status as string },
    });
  } catch (txErr) {
    console.error(`[PATCH /api/reports/${reportId}] Transaction failed:`, txErr);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
