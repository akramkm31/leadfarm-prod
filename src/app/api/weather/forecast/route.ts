import { NextRequest, NextResponse } from "next/server";
import { DOMAINE_LAT, DOMAINE_LNG } from "@/lib/weather-map";

const OPEN_METEO =
  "https://api.open-meteo.com/v1/forecast";

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") ?? String(DOMAINE_LAT));
  const lng = parseFloat(searchParams.get("lng") ?? String(DOMAINE_LNG));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ success: false, error: "Invalid coordinates" }, { status: 400 });
  }

  const url =
    `${OPEN_METEO}?latitude=${lat}&longitude=${lng}` +
    `&current_weather=true` +
    `&hourly=relative_humidity_2m,precipitation_probability,precipitation` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max` +
    `&forecast_days=7&timezone=auto`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Open-Meteo ${res.status}` },
        { status: 502 }
      );
    }
    const json = await res.json();
    const daily = json.daily;
    const hourly = json.hourly;
    const cw = json.current_weather;
    if (!daily?.time?.length || !cw) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 502 });
    }

    const hour = new Date().getHours();
    const weekly = [];
    const count = Math.min(7, daily.time.length);

    for (let i = 0; i < count; i++) {
      const dateIso = daily.time[i] as string;
      const dateObj = new Date(dateIso);
      const humiditySlice = (hourly?.relative_humidity_2m ?? []).slice(i * 24, (i + 1) * 24);
      const humidityAvg =
        humiditySlice.length > 0
          ? Math.round(
              humiditySlice.reduce((a: number, b: number) => a + b, 0) / humiditySlice.length
            )
          : 55;

      weekly.push({
        dateIso,
        dateLabel: dateObj.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        dayShort: DAY_NAMES[dateObj.getDay()],
        tempMin: Math.round(daily.temperature_2m_min[i] ?? 0),
        tempMax: Math.round(daily.temperature_2m_max[i] ?? 0),
        humidityAvg,
        precipProb: Math.round(daily.precipitation_probability_max[i] ?? 0),
        precipMm: Math.round((daily.precipitation_sum[i] ?? 0) * 10) / 10,
        weathercode: daily.weathercode[i] ?? 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        temperature: Math.round(cw.temperature ?? 0),
        humidity: Math.round(hourly?.relative_humidity_2m?.[hour] ?? 55),
        windspeed: cw.windspeed ?? 0,
        winddirection: cw.winddirection ?? 0,
        precipitationProb: Math.round(
          hourly?.precipitation_probability?.[hour] ??
            daily.precipitation_probability_max?.[0] ??
            0
        ),
        weathercode: cw.weathercode ?? 0,
        weekly,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Forecast fetch failed";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
