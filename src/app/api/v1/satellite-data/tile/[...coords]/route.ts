import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { fetchSentinelTilePng, isCdseConfigured } from "@/lib/satellite/cdse-client";

// 1×1 transparent PNG fallback (never break map tile layout)
const EMPTY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQ" +
  "AABjkB6QAAAABJRU5ErkJggg==",
  "base64"
);

function emptyTile() {
  return new NextResponse(EMPTY_PNG, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=60" },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ coords: string[] }> }
) {
  const { coords } = await params;
  if (!coords || coords.length < 3) return emptyTile();

  const z = parseInt(coords[0], 10);
  const x = parseInt(coords[1], 10);
  const y = parseInt(coords[2], 10);
  if (isNaN(z) || isNaN(x) || isNaN(y)) return emptyTile();

  // Light auth check — cookies are sent automatically for same-origin img requests
  const auth = await withAuth(req);
  if (auth.error) return emptyTile();

  if (!isCdseConfigured()) return emptyTile();

  const index = (req.nextUrl.searchParams.get("index") ?? "ndvi") as "ndvi" | "ndwi";
  const days  = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("days") ?? "30"), 7), 90);

  try {
    const buf = await fetchSentinelTilePng(z, x, y, { index, days });
    if (!buf) return emptyTile();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch {
    return emptyTile();
  }
}
