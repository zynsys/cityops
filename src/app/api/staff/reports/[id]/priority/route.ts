import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@auth";
import { prisma } from "@/lib/prisma";
import { ReportPriority, ActivityAction } from "@/generated/prisma/enums";

const ALLOWED_ROLES = new Set(["authority_user", "tenant_admin", "platform_admin"]);

const updatePrioritySchema = z.object({
  priority: z.nativeEnum(ReportPriority).nullable(),
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

  const result = updatePrioritySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", details: result.error.issues },
      { status: 400 }
    );
  }

  const { priority: newPriority } = result.data;

  const report = await prisma.report.findUnique({
    where: { id: reportId, deletedAt: null },
    select: { id: true, priority: true, tenantId: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Tenant isolation — platform admins exempt
  if (role !== "platform_admin" && report.tenantId !== tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const oldPriority = report.priority;

  await prisma.$transaction([
    prisma.report.update({
      where: { id: reportId },
      data: { priority: newPriority },
    }),
    prisma.reportActivity.create({
      data: {
        tenantId: report.tenantId,
        reportId: reportId,
        userId,
        action: ActivityAction.priority_changed,
        oldValue: oldPriority ?? "none",
        newValue: newPriority ?? "none",
      },
    }),
  ]);

  return NextResponse.json({ success: true, priority: newPriority }, { status: 200 });
}
