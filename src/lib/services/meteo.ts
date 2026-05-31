const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

export interface MeteoForecast {
  wind_speed_max_kmh: number;
  precipitation_sum_mm: number;
  temperature_max_c: number;
  temperature_min_c: number;
  precipitation_probability_max: number;
}

export interface PlanningMeteoCheck {
  valid: boolean;
  blockers: string[];
  forecast: MeteoForecast;
}

export async function getMeteoForecast(
  latitude: number,
  longitude: number,
  date: string // ISO date YYYY-MM-DD
): Promise<MeteoForecast> {
  const url = new URL(OPEN_METEO_BASE);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("daily", [
    "wind_speed_10m_max",
    "precipitation_sum",
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_probability_max"
  ].join(","));
  url.searchParams.set("start_date", date);
  url.searchParams.set("end_date", date);
  url.searchParams.set("timezone", "Africa/Algiers");
  url.searchParams.set("wind_speed_unit", "kmh");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } } as any);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

  const data = await res.json();
  const d = data.daily;

  if (!d || !d.wind_speed_10m_max || d.wind_speed_10m_max.length === 0) {
    // Return safe default values if API fails to yield daily details
    return {
      wind_speed_max_kmh: 0,
      precipitation_sum_mm: 0,
      temperature_max_c: 20,
      temperature_min_c: 10,
      precipitation_probability_max: 0
    };
  }

  return {
    wind_speed_max_kmh:           d.wind_speed_10m_max[0] ?? 0,
    precipitation_sum_mm:          d.precipitation_sum[0] ?? 0,
    temperature_max_c:             d.temperature_2m_max[0] ?? 20,
    temperature_min_c:             d.temperature_2m_min[0] ?? 10,
    precipitation_probability_max: d.precipitation_probability_max[0] ?? 0,
  };
}

export async function checkPlanningMeteo(
  latitude: number,
  longitude: number,
  date: string,
  seuil: { vent_max_km_h: number; pluie_delai_heures: number; temperature_min_c: number; temperature_max_c: number }
): Promise<PlanningMeteoCheck> {
  const forecast = await getMeteoForecast(latitude, longitude, date);
  const blockers: string[] = [];

  if (forecast.wind_speed_max_kmh > seuil.vent_max_km_h) {
    blockers.push(`Vent ${forecast.wind_speed_max_kmh} km/h > seuil ${seuil.vent_max_km_h} km/h`);
  }
  if (forecast.precipitation_probability_max > 60) {
    blockers.push(`Risque pluie ${forecast.precipitation_probability_max}% dans les ${seuil.pluie_delai_heures}h`);
  }
  if (forecast.temperature_max_c > seuil.temperature_max_c) {
    blockers.push(`T° max ${forecast.temperature_max_c}°C dépasse seuil ${seuil.temperature_max_c}°C`);
  }
  if (forecast.temperature_min_c < seuil.temperature_min_c) {
    blockers.push(`T° min ${forecast.temperature_min_c}°C sous seuil ${seuil.temperature_min_c}°C`);
  }

  return { valid: blockers.length === 0, blockers, forecast };
}
