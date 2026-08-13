import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@auth";
import { prisma } from "@/lib/prisma";
import { ReportStatus, ActivityAction } from "@/generated/prisma/enums";
import { sendStatusChangeEmail } from "@/lib/email";

const ALLOWED_ROLES = new Set(["authority_user", "tenant_admin", "platform_admin"]);

const ALLOWED_TRANSITIONS: Partial<Record<ReportStatus, ReportStatus[]>> = {
  created: [ReportStatus.under_validation, ReportStatus.invalid],
  under_validation: [ReportStatus.validated, ReportStatus.invalid],
  validated: [ReportStatus.assigned, ReportStatus.invalid],
  invalid: [ReportStatus.under_validation],
  assigned: [ReportStatus.in_progress, ReportStatus.validated],
  in_progress: [ReportStatus.resolved, ReportStatus.assigned],
  resolved: [ReportStatus.closed, ReportStatus.in_progress],
  closed: [ReportStatus.resolved],
};

const updateStatusSchema = z.object({
  status: z.nativeEnum(ReportStatus),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
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

  const result = updateStatusSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", details: result.error.issues },
      { status: 400 }
    );
  }

  const { status: newStatus } = result.data;

  const report = await prisma.report.findUnique({
    where: { id: reportId, deletedAt: null },
    select: {
      id: true,
      status: true,
      tenantId: true,
      title: true,
      reporter: {
        select: {
          id: true,
          email: true,
          displayName: true,
          emailVerifiedAt: true,
        },
      },
      tenant: {
        select: { name: true },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Tenant isolation — platform admins are exempt
  if (role !== "platform_admin" && report.tenantId !== tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedNext = ALLOWED_TRANSITIONS[report.status] ?? [];
  if (!allowedNext.includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status transition" }, { status: 422 });
  }

  const now = new Date();
  const oldStatus = report.status;

  await prisma.$transaction([
    prisma.report.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        updatedAt: now,
        ...(newStatus === ReportStatus.resolved ? { resolvedAt: now } : {}),
        ...(newStatus === ReportStatus.closed ? { closedAt: now } : {}),
      },
    }),
    prisma.reportActivity.create({
      data: {
        tenantId: report.tenantId,
        reportId: reportId,
        userId,
        action: ActivityAction.status_changed,
        oldValue: oldStatus,
        newValue: newStatus,
      },
    }),
  ]);

  // Fire-and-forget: notify reporter if they have a verified email
  const reporter = report.reporter;
  if (reporter?.email && reporter.emailVerifiedAt) {
    void sendStatusChangeEmail({
      to: reporter.email,
      displayName: reporter.displayName ?? "there",
      reportId: report.id,
      reportTitle: report.title,
      oldStatus,
      newStatus,
      tenantName: report.tenant.name,
      tenantId: report.tenantId,
      userId: reporter.id,
    });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
