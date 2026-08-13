import { NextRequest, NextResponse } from "next/server";
import { extname } from "path";
import { auth } from "@auth";
import { createReportSchema } from "@/lib/validations/reports";
import { createReport, type FileEntry } from "@/db/mutations/reports";
import { uploadAttachment } from "@/lib/storage";
import { validateReportWithAI } from "@/lib/ai/validateReport";
import { sendReportSubmissionEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILE_COUNT = 5;

export async function POST(req: NextRequest) {
  // Authentication gate
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  // Parse and validate the JSON payload attached as the "data" field
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

  const result = createReportSchema.safeParse(parsedBody);
  if (!result.success) {
    return NextResponse.json(
      { error: "validation_error", details: result.error.issues },
      { status: 400 }
    );
  }

  // Re-validate attachments server-side
  const files = formData.getAll("attachments[]").filter((f): f is File => f instanceof File);

  if (files.length > MAX_FILE_COUNT) {
    return NextResponse.json(
      {
        error: "validation_error",
        details: [`Maximum ${MAX_FILE_COUNT} attachments allowed.`],
      },
      { status: 400 }
    );
  }

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: "validation_error",
          details: [`File type "${file.type}" is not allowed.`],
        },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "validation_error",
          details: [`File "${file.name}" exceeds the 10 MB size limit.`],
        },
        { status: 400 }
      );
    }
  }

  // Pre-generate UUID-based storage names so the DB record and uploaded file share the same name
  const fileEntries: FileEntry[] = files.map((file) => {
    const ext = extname(file.name).toLowerCase() || ".bin";
    return { file, storageName: `${crypto.randomUUID()}${ext}` };
  });

  try {
    // 1. Create DB records (storagePath built from reportId + storageName inside createReport)
    const report = await createReport(
      { ...result.data, reporterUserId: session.user.userId },
      fileEntries
    );

    // 2. Upload bytes after the transaction commits, using the same storageName
    await Promise.all(
      fileEntries.map(({ file, storageName }) =>
        uploadAttachment(file, report.id, storageName)
      )
    );

    const response = NextResponse.json({ success: true, report }, { status: 201 });

    // 3. Fire AI validation after the response is prepared — non-blocking
    validateReportWithAI(report.id).catch((err) =>
      console.error("[AI Validation] Error for report", report.id, err)
    );

    // 4. Fire submission confirmation email — non-blocking
    void (async () => {
      try {
        const reporter = await prisma.user.findUnique({
          where: { id: session.user.userId },
          select: { email: true, displayName: true, emailVerifiedAt: true },
        });
        const tenant = await prisma.tenant.findUnique({
          where: { id: result.data.tenantId },
          select: { name: true },
        });
        if (reporter?.email && reporter.emailVerifiedAt && tenant) {
          void sendReportSubmissionEmail({
            to: reporter.email,
            displayName: reporter.displayName ?? "there",
            reportId: report.id,
            reportTitle: report.title,
            tenantName: tenant.name,
            tenantId: result.data.tenantId,
            userId: session.user.userId,
          });
        }
      } catch {
        // Notification failure must never affect the submission response
      }
    })();

    return response;
  } catch {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export function PUT() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export function DELETE() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
