import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@auth";
import { prisma } from "@/lib/prisma";
import { ActivityAction } from "@/generated/prisma/enums";

const ALLOWED_ROLES = new Set(["authority_user", "tenant_admin", "platform_admin"]);

const createLinkSchema = z.object({
  targetReportId: z.coerce.number().int().positive(),
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

  const result = createLinkSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation error", details: result.error.issues },
      { status: 400 }
    );
  }

  const { targetReportId } = result.data;

  if (targetReportId === reportId) {
    return NextResponse.json({ error: "Cannot link a report to itself" }, { status: 400 });
  }

  // Fetch source report
  const sourceReport = await prisma.report.findUnique({
    where: { id: reportId, deletedAt: null },
    select: { id: true, tenantId: true },
  });
  if (!sourceReport) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Tenant isolation
  if (role !== "platform_admin" && sourceReport.tenantId !== tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate target report belongs to same tenant
  const targetReport = await prisma.report.findUnique({
    where: { id: targetReportId, deletedAt: null },
    select: { id: true, title: true, tenantId: true },
  });
  if (!targetReport) {
    return NextResponse.json({ error: "Target report not found" }, { status: 404 });
  }
  if (targetReport.tenantId !== sourceReport.tenantId) {
    return NextResponse.json(
      { error: "Cannot link reports from different tenants" },
      { status: 400 }
    );
  }

  // Check for existing link in either direction
  const existing = await prisma.duplicateLink.findFirst({
    where: {
      OR: [
        { sourceReportId: reportId, targetReportId },
        { sourceReportId: targetReportId, targetReportId: reportId },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Already linked" }, { status: 409 });
  }

  const [link] = await prisma.$transaction([
    prisma.duplicateLink.create({
      data: {
        tenantId: sourceReport.tenantId,
        sourceReportId: reportId,
        targetReportId,
        linkedByUserId: userId,
      },
      select: {
        id: true,
        targetReport: { select: { id: true, title: true } },
      },
    }),
    prisma.reportActivity.create({
      data: {
        tenantId: sourceReport.tenantId,
        reportId: reportId,
        userId,
        action: ActivityAction.duplicate_linked,
        newValue: String(targetReportId),
      },
    }),
  ]);

  return NextResponse.json({ success: true, link }, { status: 201 });
}
