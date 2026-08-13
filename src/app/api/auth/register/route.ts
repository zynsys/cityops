import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/email";

const BCRYPT_COST = 12;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Server-side validation using the shared schema
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { displayName, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = displayName.trim();

  try {
    // Duplicate email check (case-insensitive, non-deleted users)
    const existing = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "email_already_exists" },
        { status: 409 }
      );
    }

    // Resolve the platform default tenant (oldest active tenant)
    const defaultTenant = await prisma.tenant.findFirst({
      where: { status: "active", deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!defaultTenant) {
      return NextResponse.json(
        { error: "platform_not_configured" },
        { status: 500 }
      );
    }

    // Resolve the citizen role id
    const citizenRole = await prisma.role.findUnique({
      where: { name: "citizen" },
      select: { id: true },
    });

    if (!citizenRole) {
      return NextResponse.json(
        { error: "platform_not_configured" },
        { status: 500 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    // Generate a cryptographically secure verification token
    const tokenValue = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    // Atomic transaction: User + UserRole + EmailVerificationToken
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId: defaultTenant.id,
          email: normalizedEmail,
          displayName: trimmedName,
          passwordHash,
          isActive: true,
          emailVerifiedAt: null,
        },
        select: { id: true, email: true },
      });

      await tx.userRole.create({
        data: {
          tenantId: defaultTenant.id,
          userId: user.id,
          roleId: citizenRole.id,
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          tenantId: defaultTenant.id,
          userId: user.id,
          token: tokenValue,
          expiresAt,
        },
      });

      return user;
    });

    // Fire verification email — failure must not fail the registration response
    sendVerificationEmail(newUser.email, tokenValue).catch(() => {});

    return NextResponse.json(
      { success: true, email: newUser.email },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register] unexpected error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
