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

export type WeatherMapData = {
  temperature: number;
  windspeed: number;
  winddirection: number;
  precipitationProb: number;
  weathercode: number;
  rainCells: RainCell[];
};

type PointWeather = {
  precipProb: number;
  precipMm: number;
  wind?: { speed: number; direction: number };
  temperature?: number;
  weathercode?: number;
};

async function fetchPointWeather(lat: number, lng: number): Promise<PointWeather | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current_weather=true&hourly=precipitation_probability,precipitation&forecast_days=1&timezone=auto`;
    const res = await fetch(url);
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

export async function fetchWeatherMapData(
  bounds: { south: number; north: number; west: number; east: number }
): Promise<WeatherMapData | null> {
  const rows = 5;
  const cols = 5;
  const latStep = (bounds.north - bounds.south) / rows;
  const lngStep = (bounds.east - bounds.west) / cols;
  const halfLat = latStep / 2;
  const halfLng = lngStep / 2;

  const tasks: { lat: number; lng: number; row: number; col: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tasks.push({
        lat: bounds.south + latStep * (r + 0.5),
        lng: bounds.west + lngStep * (c + 0.5),
        row: r,
        col: c,
      });
    }
  }

  const results = await Promise.all(
    tasks.map(async (t) => ({ ...t, data: await fetchPointWeather(t.lat, t.lng) }))
  );

  const center = results.find((r) => r.row === 2 && r.col === 2)?.data;
  const fallback = results.find((r) => r.data)?.data;
  const windSource = center ?? fallback;
  if (!windSource?.wind) return null;

  const rainCells: RainCell[] = results
    .filter((r) => r.data && (r.data.precipProb > 5 || r.data.precipMm > 0))
    .map((r) => ({
      lat: r.lat,
      lng: r.lng,
      halfLat,
      halfLng,
      precipProb: r.data!.precipProb,
      precipMm: r.data!.precipMm,
    }));

  const avgProb =
    results.reduce((s, r) => s + (r.data?.precipProb ?? 0), 0) / results.length;

  return {
    temperature: windSource.temperature ?? 0,
    windspeed: windSource.wind.speed,
    winddirection: windSource.wind.direction,
    precipitationProb: Math.round(avgProb),
    weathercode: windSource.weathercode ?? 0,
    rainCells,
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
