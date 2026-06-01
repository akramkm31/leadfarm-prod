export type OwmLayerId = "wind" | "precipitation" | "clouds" | "temp";

export type OwmLayerConfig = {
  id: OwmLayerId;
  label: string;
  tile: string;
};

export const OWM_LAYERS: OwmLayerConfig[] = [
  { id: "wind", label: "Vent", tile: "wind_new" },
  { id: "precipitation", label: "Pluie", tile: "precipitation_new" },
  { id: "clouds", label: "Nuages", tile: "clouds_new" },
  { id: "temp", label: "Temp.", tile: "temp_new" },
];

export type WeatherLayerState = Record<OwmLayerId, boolean>;

export const DEFAULT_WEATHER_LAYERS: WeatherLayerState = {
  wind: true,
  precipitation: true,
  clouds: false,
  temp: false,
};

export function owmTileUrl(tile: string): string {
  return `/api/weather/tiles/${tile}/{z}/{x}/{y}.png`;
}
