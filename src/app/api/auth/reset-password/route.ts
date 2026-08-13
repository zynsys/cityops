import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const BCRYPT_COST = 12;

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one digit."),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;

  // DB lookup — exact match, must be unused and not expired
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "invalid_or_expired_token" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true }, { status: 200 });
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
