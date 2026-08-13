import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const schema = z.object({
  email: z.string().email(),
});

const OK = NextResponse.json({ success: true }, { status: 200 });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const normalizedEmail = parsed.data.email.toLowerCase().trim();

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, email: true, tenantId: true },
    });

    if (user) {
      const tokenValue = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

      await prisma.$transaction([
        prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tenantId: user.tenantId,
            token: tokenValue,
            expiresAt,
          },
        }),
      ]);

      sendPasswordResetEmail(user.email, tokenValue).catch(() => {});
    }
  } catch {
    // Swallow — always return the same response
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
