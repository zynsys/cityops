import { NextRequest, NextResponse } from "next/server";
import { getSimilarReports } from "@/db/queries/reports";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const categoryId = searchParams.get("categoryId");
  const title = searchParams.get("title");
  const tenantId = searchParams.get("tenantId") ?? undefined;
  const radiusStr = searchParams.get("radiusMetres");

  // Validate required params
  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }
  if (!categoryId) {
    return NextResponse.json(
      { error: "categoryId is required" },
      { status: 400 }
    );
  }
  if (title === null || title === "") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { error: "lat and lng must be valid coordinates" },
      { status: 400 }
    );
  }

  if (!UUID_REGEX.test(categoryId)) {
    return NextResponse.json(
      { error: "categoryId must be a valid UUID" },
      { status: 400 }
    );
  }

  if (tenantId !== undefined && !UUID_REGEX.test(tenantId)) {
    return NextResponse.json(
      { error: "tenantId must be a valid UUID" },
      { status: 400 }
    );
  }

  let radiusMetres = 500;
  if (radiusStr !== null) {
    const parsed = parseInt(radiusStr, 10);
    if (isNaN(parsed) || parsed <= 0) {
      return NextResponse.json(
        { error: "radiusMetres must be a positive integer" },
        { status: 400 }
      );
    }
    radiusMetres = parsed;
    // Server-side cap enforced inside getSimilarReports
  }

  const candidates = await getSimilarReports({
    lat,
    lng,
    categoryId,
    // Truncate title to a safe length before using in full-text search
    title: title.slice(0, 500),
    tenantId,
    radiusMetres,
  });

  return NextResponse.json({ candidates });
}
