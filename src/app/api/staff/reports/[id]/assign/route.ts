import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@auth";
import { prisma } from "@/lib/prisma";
import { ActivityAction } from "@/generated/prisma/enums";
import { sendAssignmentNotificationEmail } from "@/lib/email";

const ALLOWED_ROLES = new Set(["authority_user", "tenant_admin", "platform_admin"]);

const ASSIGNABLE_ROLES = ["authority_user", "tenant_admin"];

const assignSchema = z.object({
  assignedToUserId: z.string().uuid().nullable(),
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

  const result = assignSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", details: result.error.issues },
      { status: 400 }
    );
  }

  const { assignedToUserId } = result.data;

  const report = await prisma.report.findUnique({
    where: { id: reportId, deletedAt: null },
    select: {
      id: true,
      tenantId: true,
      title: true,
      priority: true,
      locationText: true,
      tenant: { select: { name: true } },
      category: { select: { name: true } },
      reporter: { select: { displayName: true } },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Tenant isolation — platform admins exempt
  if (role !== "platform_admin" && report.tenantId !== tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let targetUser: { id: string; displayName: string; email: string } | null = null;
  if (assignedToUserId) {
    const candidate = await prisma.user.findFirst({
      where: {
        id: assignedToUserId,
        tenantId: report.tenantId,
        isActive: true,
        deletedAt: null,
        userRoles: {
          some: {
            tenantId: report.tenantId,
            role: { name: { in: ASSIGNABLE_ROLES } },
          },
        },
      },
      select: { id: true, displayName: true, email: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Assignee must be an active staff member of the same tenant" },
        { status: 400 }
      );
    }

    targetUser = candidate;
  }

  // Fetch the assigning user's display name for the email
  const assigningUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // 1. Mark any current assignment inactive
    await tx.reportAssignment.updateMany({
      where: { reportId: reportId, isCurrent: true },
      data: { isCurrent: false, unassignedAt: now },
    });

    // 2. Create new assignment if assigning to someone
    if (assignedToUserId) {
      await tx.reportAssignment.create({
        data: {
          tenantId: report.tenantId,
          reportId: reportId,
          assignedToUserId,
          assignedByUserId: userId,
          isCurrent: true,
        },
      });
    }

    // 3. Update denormalised field on report
    await tx.report.update({
      where: { id: reportId },
      data: { assignedUserId: assignedToUserId },
    });

    // 4. Log activity
    await tx.reportActivity.create({
      data: {
        tenantId: report.tenantId,
        reportId: reportId,
        userId,
        action: assignedToUserId ? ActivityAction.assigned : ActivityAction.reassigned,
        newValue: targetUser?.displayName ?? "none",
      },
    });
  });

  // Notify the assigned staff member (fire-and-forget, skip on unassignment)
  if (targetUser && assignedToUserId) {
    void sendAssignmentNotificationEmail({
      to: targetUser.email,
      displayName: targetUser.displayName,
      reportId: String(reportId),
      reportTitle: report.title,
      priority: report.priority ?? null,
      categoryName: report.category.name,
      locationText: report.locationText ?? null,
      reporterName: report.reporter.displayName,
      assignedByName: assigningUser?.displayName ?? "A staff member",
      tenantName: report.tenant.name,
      tenantId: report.tenantId,
      userId: targetUser.id,
    });
  }

  return NextResponse.json(
    { success: true, assignedTo: targetUser },
    { status: 200 }
  );
}

