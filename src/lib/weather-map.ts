export const DOMAINE_LAT = 34.98524;
export const DOMAINE_LNG = -0.53257;

export type RainCell = {
  lat: number;
  lng: number;
  halfLat: number;
  halfLng: number;
  precipProb: number;
  precipMm: number;
};

export type WeatherDayForecast = {
  dateIso: string;
  dateLabel: string;
  dayShort: string;
  tempMin: number;
  tempMax: number;
  humidityAvg: number;
  precipProb: number;
  precipMm: number;
  weathercode: number;
};

export type WeatherMapData = {
  temperature: number;
  humidity: number;
  windspeed: number;
  winddirection: number;
  precipitationProb: number;
  weathercode: number;
  rainCells: RainCell[];
  weekly: WeatherDayForecast[];
};

type PointWeather = {
  precipProb: number;
  precipMm: number;
  wind?: { speed: number; direction: number };
  temperature?: number;
  weathercode?: number;
};

const DAY_NAMES = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

async function fetchPointWeather(lat: number, lng: number): Promise<PointWeather | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current_weather=true&hourly=precipitation_probability,precipitation&forecast_days=1&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const json = await res.json();
    const hour = new Date().getHours();
    return {
      precipProb: json.hourly?.precipitation_probability?.[hour] ?? 0,
      precipMm: json.hourly?.precipitation?.[hour] ?? 0,
      wind: json.current_weather
        ? {
            speed: json.current_weather.windspeed ?? 0,
            direction: json.current_weather.winddirection ?? 0,
          }
        : undefined,
      temperature: json.current_weather?.temperature,
      weathercode: json.current_weather?.weathercode,
    };
  } catch {
    return null;
  }
}

async function fetchDomainForecastDirect(
  lat: number,
  lng: number
): Promise<{
  current: Omit<WeatherMapData, "rainCells" | "weekly">;
  weekly: WeatherDayForecast[];
} | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current_weather=true` +
    `&hourly=relative_humidity_2m,precipitation_probability,precipitation` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max` +
    `&forecast_days=7&timezone=auto`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return null;
  const json = await res.json();
  const daily = json.daily;
  const hourly = json.hourly;
  const cw = json.current_weather;
  if (!daily?.time?.length || !cw) return null;

  const hour = new Date().getHours();
  const weekly: WeatherDayForecast[] = [];
  const count = Math.min(7, daily.time.length);

  for (let i = 0; i < count; i++) {
    const dateIso = daily.time[i] as string;
    const dateObj = new Date(dateIso);
    const humiditySlice = (hourly?.relative_humidity_2m ?? []).slice(i * 24, (i + 1) * 24);
    const humidityAvg =
      humiditySlice.length > 0
        ? Math.round(humiditySlice.reduce((a: number, b: number) => a + b, 0) / humiditySlice.length)
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

  return {
    current: {
      temperature: Math.round(cw.temperature ?? 0),
      humidity: Math.round(hourly?.relative_humidity_2m?.[hour] ?? 55),
      windspeed: cw.windspeed ?? 0,
      winddirection: cw.winddirection ?? 0,
      precipitationProb: Math.round(
        hourly?.precipitation_probability?.[hour] ?? daily.precipitation_probability_max?.[0] ?? 0
      ),
      weathercode: cw.weathercode ?? 0,
    },
    weekly,
  };
}

export async function fetchDomainForecast(
  lat: number,
  lng: number
): Promise<{
  current: Omit<WeatherMapData, "rainCells" | "weekly">;
  weekly: WeatherDayForecast[];
} | null> {
  try {
    const res = await fetch(
      `/api/weather/forecast?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`,
      { signal: AbortSignal.timeout(16_000) }
    );
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        return {
          current: {
            temperature: d.temperature,
            humidity: d.humidity,
            windspeed: d.windspeed,
            winddirection: d.winddirection,
            precipitationProb: d.precipitationProb,
            weathercode: d.weathercode,
          },
          weekly: d.weekly as WeatherDayForecast[],
        };
      }
    }
  } catch {
    /* fallback direct */
  }
  try {
    return await fetchDomainForecastDirect(lat, lng);
  } catch {
    return null;
  }
}

export function buildRainGridBounds(points: [number, number][]): {
  south: number;
  north: number;
  west: number;
  east: number;
} {
  if (points.length === 0) {
    return {
      south: DOMAINE_LAT - 0.012,
      north: DOMAINE_LAT + 0.012,
      west: DOMAINE_LNG - 0.012,
      east: DOMAINE_LNG + 0.012,
    };
  }
  let south = points[0][0];
  let north = points[0][0];
  let west = points[0][1];
  let east = points[0][1];
  for (const [lat, lng] of points) {
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lng);
    east = Math.max(east, lng);
  }
  const padLat = Math.max(0.004, (north - south) * 0.15);
  const padLng = Math.max(0.004, (east - west) * 0.15);
  return {
    south: south - padLat,
    north: north + padLat,
    west: west - padLng,
    east: east + padLng,
  };
}

async function fetchRainGrid(
  bounds: { south: number; north: number; west: number; east: number }
): Promise<RainCell[]> {
  const rows = 3;
  const cols = 3;
  const latStep = (bounds.north - bounds.south) / rows;
  const lngStep = (bounds.east - bounds.west) / cols;
  const halfLat = latStep / 2;
  const halfLng = lngStep / 2;

  const tasks: { lat: number; lng: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tasks.push({
        lat: bounds.south + latStep * (r + 0.5),
        lng: bounds.west + lngStep * (c + 0.5),
      });
    }
  }

  const gridResults = await Promise.all(
    tasks.map(async (t) => ({ ...t, data: await fetchPointWeather(t.lat, t.lng) }))
  );

  return gridResults
    .filter((r) => r.data && (r.data.precipProb > 5 || r.data.precipMm > 0))
    .map((r) => ({
      lat: r.lat,
      lng: r.lng,
      halfLat,
      halfLng,
      precipProb: r.data!.precipProb,
      precipMm: r.data!.precipMm,
    }));
}

export async function fetchWeatherMapData(
  bounds: { south: number; north: number; west: number; east: number }
): Promise<WeatherMapData | null> {
  const centerLat = (bounds.south + bounds.north) / 2;
  const centerLng = (bounds.west + bounds.east) / 2;

  const domain = await fetchDomainForecast(centerLat, centerLng);
  if (!domain) return null;

  let rainCells: RainCell[] = [];
  try {
    rainCells = await Promise.race([
      fetchRainGrid(bounds),
      new Promise<RainCell[]>((_, reject) =>
        setTimeout(() => reject(new Error("grid timeout")), 6_000)
      ),
    ]);
  } catch {
    rainCells = [];
  }

  return {
    ...domain.current,
    rainCells,
    weekly: domain.weekly,
  };
}

export function windFlowDegrees(meteoDirection: number): number {
  return (meteoDirection + 180) % 360;
}

export function windArrowHtml(speed: number, direction: number, size = 72): string {
  const flow = windFlowDegrees(direction);
  const length = Math.min(52, 22 + speed * 1.1);
  const color =
    speed > 30 ? "#dc2626" : speed > 15 ? "#d97706" : speed > 8 ? "#1d4ed8" : "#0f172a";
  return `<div class="weather-wind-marker" style="width:${size}px;height:${size}px;" aria-hidden="true">
    <div class="weather-wind-arrow" style="transform:rotate(${flow}deg);--arrow-len:${length}px;--arrow-color:${color};">
      <span class="weather-wind-shaft"></span>
      <span class="weather-wind-head"></span>
    </div>
  </div>`;
}

export function rainZoneHtml(intensity: number): string {
  const drops = Math.min(12, Math.max(3, Math.round(intensity / 8)));
  const dropEls = Array.from({ length: drops }, (_, i) => {
    const left = 8 + ((i * 17) % 84);
    const delay = (i * 0.18) % 1.2;
    const dur = 0.7 + (i % 4) * 0.15;
    return `<span class="weather-rain-drop" style="left:${left}%;animation-delay:${delay}s;animation-duration:${dur}s;"></span>`;
  }).join("");
  return `<div class="weather-rain-zone" data-intensity="${Math.round(intensity)}" aria-hidden="true">${dropEls}</div>`;
}
