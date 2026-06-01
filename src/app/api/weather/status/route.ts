import { NextResponse } from "next/server";

function getOwmKey(): string | null {
  const key = process.env.OPENWEATHERMAP_API_KEY?.trim();
  return key || null;
}

export async function GET() {
  const key = getOwmKey();
  if (!key) {
    return NextResponse.json({
      configured: false,
      valid: false,
      error: "missing_key",
    });
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=34.985&lon=-0.533&appid=${key}&units=metric`,
      { cache: "no-store" }
    );

    if (res.ok) {
      return NextResponse.json({ configured: true, valid: true, error: null });
    }

    const body = (await res.json().catch(() => ({}))) as { message?: string; cod?: number };
    return NextResponse.json({
      configured: true,
      valid: false,
      error: body.message || `http_${res.status}`,
    });
  } catch {
    return NextResponse.json({
      configured: true,
      valid: false,
      error: "network_error",
    });
  }
}
