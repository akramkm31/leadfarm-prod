"use client";

import { X, Loader2, Wind, Droplets, Thermometer, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherMapData } from "@/lib/weather-map";
import {
  OWM_LAYERS,
  type OwmLayerId,
  type WeatherLayerState,
} from "@/lib/open-weather-layers";

const WMO_ICONS: Record<number, string> = {
  0: "☀️", 1: "🌤", 2: "⛅", 3: "☁️",
  45: "🌫", 48: "🌫", 51: "🌦", 53: "🌦", 55: "🌧",
  61: "🌧", 63: "🌧", 65: "🌧", 71: "🌨", 73: "🌨", 75: "❄️",
  80: "🌦", 81: "🌧", 82: "⛈", 95: "⛈", 96: "⛈", 99: "⛈",
};

interface WeatherMapHudProps {
  weather: WeatherMapData | null;
  loading: boolean;
  layers: WeatherLayerState;
  opacity: number;
  onLayersChange: (layers: WeatherLayerState) => void;
  onOpacityChange: (opacity: number) => void;
  onClose: () => void;
}

export default function WeatherMapHud({
  weather,
  loading,
  layers,
  opacity,
  onLayersChange,
  onOpacityChange,
  onClose,
}: WeatherMapHudProps) {
  const toggleLayer = (id: OwmLayerId) => {
    onLayersChange({ ...layers, [id]: !layers[id] });
  };

  return (
    <div className="weather-map-hud">
      <div className="weather-map-hud-head">
        <div>
          <p className="weather-map-hud-eyebrow">Météo domaine</p>
          <h2 className="weather-map-hud-title">Conditions applicatives</h2>
        </div>
        <button
          type="button"
          className="weather-map-hud-close"
          onClick={onClose}
          aria-label="Fermer la couche météo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="weather-map-hud-loading">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement des prévisions…
        </div>
      ) : !weather ? (
        <p className="weather-map-hud-empty">
          Prévisions indisponibles (réseau ou service météo). Réessayez dans un instant.
        </p>
      ) : (
        <>
          <div className="weather-map-hud-now">
            <span className="weather-map-hud-icon" aria-hidden>
              {WMO_ICONS[weather.weathercode] || "🌡️"}
            </span>
            <Stat
              icon={<Thermometer className="w-3.5 h-3.5" />}
              value={`${weather.temperature}°`}
              label="Température"
            />
            <Stat
              icon={<Droplets className="w-3.5 h-3.5" />}
              value={`${weather.humidity}%`}
              label="Humidité"
              warn={weather.humidity > 85}
            />
            <Stat
              icon={<CloudRain className="w-3.5 h-3.5" />}
              value={`${weather.precipitationProb}%`}
              label="Pluie (maintenant)"
              warn={weather.precipitationProb > 40}
            />
            <Stat
              icon={<Wind className="w-3.5 h-3.5" />}
              value={`${Math.round(weather.windspeed)}`}
              label={`Vent · ${Math.round(weather.winddirection)}°`}
              warn={weather.windspeed > 15}
            />
          </div>

          {weather.weekly.length > 0 && (
            <section className="weather-map-hud-week" aria-label="Prévisions 7 jours">
              <p className="weather-map-hud-week-title">7 prochains jours</p>
              <div className="weather-map-hud-week-grid">
                {weather.weekly.map((day) => (
                  <div key={day.dateIso} className="weather-map-hud-day">
                    <span className="weather-map-hud-day-name">{day.dayShort}</span>
                    <span className="weather-map-hud-day-date">{day.dateLabel}</span>
                    <span className="weather-map-hud-day-icon" aria-hidden>
                      {WMO_ICONS[day.weathercode] || "🌡️"}
                    </span>
                    <span className="weather-map-hud-day-temp">
                      {day.tempMin}° / {day.tempMax}°
                    </span>
                    <span className="weather-map-hud-day-humidity">💧 {day.humidityAvg}%</span>
                    <span
                      className={cn(
                        "weather-map-hud-day-rain",
                        (day.precipProb > 40 || day.precipMm > 2) && "is-warn"
                      )}
                    >
                      {day.precipMm > 0 ? `${day.precipMm} mm` : `${day.precipProb}%`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <details className="weather-map-hud-layers-details">
        <summary className="weather-map-hud-layers-summary">Couches carte & opacité</summary>
        <div className="weather-map-hud-layers">
          <div className="weather-map-hud-layer-btns">
            {OWM_LAYERS.map((layer) => (
              <button
                key={layer.id}
                type="button"
                className={cn(
                  "weather-map-hud-layer-btn",
                  layers[layer.id] && "is-active"
                )}
                onClick={() => toggleLayer(layer.id)}
                aria-pressed={layers[layer.id]}
              >
                {layer.label}
              </button>
            ))}
          </div>
          <label className="weather-map-hud-opacity">
            <span>Opacité · {opacity.toFixed(1)}</span>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.1}
              value={opacity}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
            />
          </label>
        </div>
      </details>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  warn,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  warn?: boolean;
}) {
  return (
    <div className={cn("weather-map-hud-stat", warn && "is-warn")}>
      {icon}
      <span className="weather-map-hud-stat-val">{value}</span>
      <span className="weather-map-hud-stat-lbl">{label}</span>
    </div>
  );
}
