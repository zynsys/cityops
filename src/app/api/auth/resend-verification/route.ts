import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const resendSchema = z.object({
  email: z.string().email(),
});

// Uniform response — never reveal whether the email exists
const OK = NextResponse.json({ success: true }, { status: 200 });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = resendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();

  try {
    // Look up the user — must be active, non-deleted, and not yet verified
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
        emailVerifiedAt: null,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        tenantId: true,
      },
    });

    if (user) {
      const tokenValue = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Invalidate all existing unused tokens, then create a fresh one
      await prisma.$transaction([
        prisma.emailVerificationToken.updateMany({
          where: {
            userId: user.id,
            usedAt: null,
          },
          data: { usedAt: new Date() },
        }),
        prisma.emailVerificationToken.create({
          data: {
            userId: user.id,
            tenantId: user.tenantId,
            token: tokenValue,
            expiresAt,
          },
        }),
      ]);

      // Fire-and-forget — errors must not leak user existence
      sendVerificationEmail(user.email, tokenValue).catch(() => {});
    }
  } catch {
    // Swallow errors — always return the same response to prevent enumeration
  }

  return OK;
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export function PUT() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export function PATCH() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export function DELETE() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
