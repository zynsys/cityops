import { NextRequest, NextResponse } from "next/server";
import { extname } from "path";
import { auth } from "@auth";
import { prisma } from "@/lib/prisma";
import { uploadAttachment } from "@/lib/storage";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "validation_error", details: [`File type "${file.type}" is not allowed.`] },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "validation_error", details: ["Avatar must be 2 MB or smaller."] },
      { status: 400 }
    );
  }

  const userId = session.user.userId;
  const ext = extname(file.name).toLowerCase() || ".jpg";
  const storageName = `${userId}_${Date.now()}${ext}`;

  const { storagePath } = await uploadAttachment(file, "avatars", storageName);

  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: storagePath },
  });

  return NextResponse.json({ success: true, avatarUrl: storagePath });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.userId },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ success: true });
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
