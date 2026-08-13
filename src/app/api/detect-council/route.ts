import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantByPoint } from "@/db/queries/tenants";

const detectCouncilSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = detectCouncilSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_coordinates",
        details: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  const { lat, lng } = parsed.data;

  try {
    const tenant = await getTenantByPoint(lat, lng);

    if (tenant) {
      return NextResponse.json({ matched: true, tenant });
    }

    return NextResponse.json({ matched: false, tenant: null });
  } catch {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export function PUT() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}

export function DELETE() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
