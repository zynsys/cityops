import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const councilSlug = searchParams.get("council");

  if (!councilSlug) {
    return NextResponse.json({ error: "Missing council param" }, { status: 400 });
  }

  // Validate slug — only lowercase letters, digits and hyphens
  if (!/^[a-z0-9-]+$/.test(councilSlug)) {
    return NextResponse.json({ error: "Invalid council slug" }, { status: 400 });
  }

  try {
    const rows = await prisma.$queryRaw<{ geojson: string }[]>`
      SELECT ST_AsGeoJSON(b.boundary) AS geojson
      FROM tenant_boundary b
      JOIN tenant t ON t.id = b.tenant_id
      WHERE t.slug = ${councilSlug}
      LIMIT 1
    `;

    if (!rows[0]?.geojson) {
      return NextResponse.json({ geojson: null });
    }

    return NextResponse.json({ geojson: JSON.parse(rows[0].geojson) });
  } catch {
    return NextResponse.json({ geojson: null });
  }
}
