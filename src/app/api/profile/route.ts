import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@auth";
import { prisma } from "@/lib/prisma";

const patchProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters.")
    .max(150, "Display name must be 150 characters or fewer.")
    .transform((v) => v.trim()),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = patchProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.userId },
    data: { displayName: parsed.data.displayName },
    select: { displayName: true },
  });

  return NextResponse.json({ success: true, displayName: user.displayName });
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
