import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashInvitationToken } from "@/lib/invitations";
import { acceptInvitationSchema } from "@/lib/validations/invitations";

const BCRYPT_COST = 12;

function isUnavailable(invitation: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}): "expired" | "invalid" | null {
  if (invitation.expiresAt <= new Date()) return "expired";
  if (invitation.acceptedAt || invitation.revokedAt) return "invalid";
  return null;
}

async function findInvitation(token: string) {
  return prisma.invitation.findUnique({
    where: { tokenHash: hashInvitationToken(token) },
    select: {
      id: true,
      tenantId: true,
      invitedByUserId: true,
      email: true,
      roleId: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      tenant: { select: { name: true } },
      role: { select: { name: true } },
    },
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.json({ error: "invitation_invalid" }, { status: 400 });
  }

  const invitation = await findInvitation(token);
  if (!invitation) {
    return NextResponse.json({ error: "invitation_invalid" }, { status: 404 });
  }

  const state = isUnavailable(invitation);
  if (state) {
    return NextResponse.json({ error: `invitation_${state}` }, { status: 410 });
  }

  return NextResponse.json({
    email: invitation.email,
    tenantName: invitation.tenant.name,
    role: invitation.role.name,
    expiresAt: invitation.expiresAt,
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = acceptInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const invitation = await findInvitation(parsed.data.token);
  if (!invitation) {
    return NextResponse.json({ error: "invitation_invalid" }, { status: 404 });
  }

  const state = isUnavailable(invitation);
  if (state) {
    return NextResponse.json({ error: `invitation_${state}` }, { status: 410 });
  }

  const email = invitation.email.trim().toLowerCase();
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json({ error: "email_already_exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { acceptedAt: now },
      });

      if (claimed.count !== 1) {
        throw new Error("invitation_unavailable");
      }

      const user = await tx.user.create({
        data: {
          tenantId: invitation.tenantId,
          email,
          displayName: parsed.data.displayName,
          passwordHash,
          invitedByUserId: invitation.invitedByUserId,
          emailVerifiedAt: now,
        },
        select: { id: true },
      });

      await tx.userRole.create({
        data: {
          tenantId: invitation.tenantId,
          userId: user.id,
          roleId: invitation.roleId,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "invitation_unavailable") {
      return NextResponse.json({ error: "invitation_invalid" }, { status: 410 });
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "email_already_exists" }, { status: 409 });
    }

    console.error("[invitation] failed to accept invitation:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
