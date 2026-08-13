import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@auth";
import { prisma } from "@/lib/prisma";
import { ActivityAction } from "@/generated/prisma/enums";
import { sendCommentNotificationEmail } from "@/lib/email";

const ALLOWED_ROLES = new Set(["authority_user", "tenant_admin", "platform_admin"]);

const MAX_BODY = 2000;

/** Strip all HTML tags — store plain text only. */
function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

const commentSchema = z.object({
  body: z
    .string()
    .transform((v) => stripHtml(v).trim())
    .pipe(z.string().min(1).max(MAX_BODY)),
  isInternal: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, tenantId, userId } = session.user;
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const reportId = parseInt(id, 10);
  if (isNaN(reportId) || reportId < 1) {
    return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = commentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", details: result.error.issues },
      { status: 422 }
    );
  }

  const { body: commentBody, isInternal } = result.data;

  const report = await prisma.report.findUnique({
    where: { id: reportId, deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      title: true,
      reporterUserId: true,
      tenant: { select: { name: true } },
      reporter: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Tenant isolation — platform admins exempt
  if (role !== "platform_admin" && report.tenantId !== tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [comment] = await prisma.$transaction([
    prisma.reportComment.create({
      data: {
        tenantId: report.tenantId,
        reportId: reportId,
        userId,
        body: commentBody,
        isInternal,
      },
      select: {
        id: true,
        body: true,
        isInternal: true,
        createdAt: true,
        user: { select: { displayName: true, avatarUrl: true } },
      },
    }),
    prisma.reportActivity.create({
      data: {
        tenantId: report.tenantId,
        reportId: reportId,
        userId,
        action: ActivityAction.commented,
        metadata: { isInternal },
      },
    }),
  ]);

  // Notify the reporter about public comments (fire-and-forget)
  if (
    !isInternal &&
    report.reporter?.email &&
    userId !== report.reporterUserId
  ) {
    void sendCommentNotificationEmail({
      to: report.reporter.email,
      displayName: report.reporter.displayName ?? "there",
      reportId: String(reportId),
      reportTitle: report.title,
      commenterName: comment.user.displayName ?? "A staff member",
      commentBody,
      tenantName: report.tenant?.name ?? "CityOps",
      tenantId: report.tenantId,
      userId: report.reporter.id,
    });
  }

  return NextResponse.json({ success: true, comment }, { status: 201 });
}
