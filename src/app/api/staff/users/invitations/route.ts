import { NextRequest, NextResponse } from "next/server";
import { auth } from "@auth";
import { prisma } from "@/lib/prisma";
import { createInvitationToken, INVITATION_EXPIRY_MS } from "@/lib/invitations";
import { sendInvitationEmail } from "@/lib/email";
import { invitationRequestSchema } from "@/lib/validations/invitations";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { role, tenantId, userId } = session.user;
  if (role !== "tenant_admin" || !tenantId || !userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = invitationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  try {
    const [existingUser, tenant, roleRecord] = await Promise.all([
      prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
        select: { id: true },
      }),
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, deletedAt: true },
      }),
      prisma.role.findUnique({
        where: { name: parsed.data.role },
        select: { id: true },
      }),
    ]);

    if (existingUser) {
      return NextResponse.json({ error: "email_already_exists" }, { status: 409 });
    }

    if (!tenant || tenant.deletedAt || !roleRecord) {
      return NextResponse.json({ error: "tenant_unavailable" }, { status: 404 });
    }

    const { token, tokenHash } = createInvitationToken();
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS);

    await prisma.$transaction(async (tx) => {
      await tx.invitation.updateMany({
        where: {
          tenantId,
          email,
          acceptedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      await tx.invitation.create({
        data: {
          tenantId,
          invitedByUserId: userId,
          email,
          roleId: roleRecord.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    void sendInvitationEmail(email, token, tenant.name).catch(() => {});

    return NextResponse.json({ success: true, email, expiresAt }, { status: 201 });
  } catch (error) {
    console.error("[invitation] failed to create invitation:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
