import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TILES = new Set([
  "wind_new",
  "precipitation_new",
  "clouds_new",
  "temp_new",
  "pressure_new",
  "pressure_cntr",
  "snow_new",
]);

function getOwmKey(): string | null {
  const key = process.env.OPENWEATHERMAP_API_KEY?.trim();
  return key || null;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ layer: string; z: string; x: string; y: string }> }
) {
  const { layer, z, x, y: yRaw } = await context.params;
  const y = yRaw.replace(/\.png$/i, "");

  if (!ALLOWED_TILES.has(layer)) {
    return new NextResponse("Invalid layer", { status: 400 });
  }

  const zNum = Number(z);
  const xNum = Number(x);
  const yNum = Number(y);
  if (!Number.isInteger(zNum) || !Number.isInteger(xNum) || !Number.isInteger(yNum)) {
    return new NextResponse("Invalid tile coordinates", { status: 400 });
  }

  const key = getOwmKey();
  if (!key) {
    return new NextResponse("OpenWeatherMap not configured", { status: 503 });
  }

  const url = `https://tile.openweathermap.org/map/${layer}/${zNum}/${xNum}/${yNum}.png?appid=${key}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    return new NextResponse(`Tile fetch failed (${res.status})`, { status: res.status });
  }

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
