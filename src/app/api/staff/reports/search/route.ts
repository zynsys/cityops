import { NextRequest, NextResponse } from "next/server";
import { auth } from "@auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = new Set(["authority_user", "tenant_admin", "platform_admin"]);

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, tenantId } = session.user;
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const excludeIdRaw = searchParams.get("excludeId");
  const excludeId = excludeIdRaw ? parseInt(excludeIdRaw, 10) : undefined;

  if (!q) {
    return NextResponse.json([], { status: 200 });
  }

  const reports = await prisma.report.findMany({
    where: {
      tenantId,
      deletedAt: null,
      title: { contains: q, mode: "insensitive" },
      ...(excludeId && !isNaN(excludeId) ? { id: { not: excludeId } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, title: true, status: true },
  });

  return NextResponse.json(reports, { status: 200 });
}
