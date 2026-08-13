import { NextRequest, NextResponse } from "next/server";
import { auth } from "@auth";
import { prisma } from "@/lib/prisma";
import { ActivityAction } from "@/generated/prisma/enums";

const ALLOWED_ROLES = new Set(["authority_user", "tenant_admin", "platform_admin"]);

interface RouteContext {
  params: Promise<{ id: string; linkId: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, tenantId, userId } = session.user;
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, linkId } = await params;
  const reportId = parseInt(id, 10);
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (isNaN(reportId) || reportId < 1 || !UUID_REGEX.test(linkId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const link = await prisma.duplicateLink.findUnique({
    where: { id: linkId },
    select: { id: true, tenantId: true, sourceReportId: true, targetReportId: true },
  });

  if (!link) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Tenant isolation
  if (role !== "platform_admin" && link.tenantId !== tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify link belongs to the report in the URL
  if (link.sourceReportId !== reportId && link.targetReportId !== reportId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.duplicateLink.delete({ where: { id: linkId } }),
    prisma.reportActivity.create({
      data: {
        tenantId: link.tenantId,
        reportId: reportId,
        userId,
        action: ActivityAction.duplicate_linked,
        metadata: { removed: true, linkId },
      },
    }),
  ]);

  return NextResponse.json({ success: true }, { status: 200 });
}
