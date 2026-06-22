/** Libellés carte Leaflet — lisibles sur fond satellite clair ou foncé */

import {
  getIndexLevel,
  getIndexValue,
  getSatelliteMapColor,
  getNdwiMapColor,
  indexBarPercent,
  resolveSavi,
  type SatelliteIndexKey,
} from "@/lib/agronome/satellite-utils";
import type { DonneesSatellite } from "@/lib/mcd/types";

export function escapeMapHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Centroïde simple (polygones convexes / rectangles) */
export function polygonCentroid(boundary: [number, number][]): [number, number] | null {
  if (!boundary?.length) return null;
  let latSum = 0;
  let lngSum = 0;
  for (const [lat, lng] of boundary) {
    latSum += lat;
    lngSum += lng;
  }
  return [latSum / boundary.length, lngSum / boundary.length];
}

/** Emprise lat/lng pour L.imageOverlay */
export function polygonLatLngBounds(
  boundary: [number, number][]
): [[number, number], [number, number]] | null {
  if (!boundary?.length) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const [lat, lng] of boundary) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

type MapPoint = { x: number; y: number };
type ClipMap = {
  latLngToLayerPoint: (latlng: [number, number]) => MapPoint;
  on: (event: string, fn: () => void) => void;
  off: (event: string, fn: () => void) => void;
};

/** Découpe l'aperçu NDVI sur le contour exact de la parcelle */
export function bindPolygonClipToImageOverlay(
  map: ClipMap,
  boundary: [number, number][],
  bounds: [[number, number], [number, number]],
  imgEl: HTMLElement
): () => void {
  const apply = () => {
    const [[south, west], [north, east]] = bounds;
    const nw = map.latLngToLayerPoint([north, west]);
    const se = map.latLngToLayerPoint([south, east]);
    const w = Math.max(se.x - nw.x, 1);
    const h = Math.max(se.y - nw.y, 1);
    const pts = boundary.map(([lat, lng]) => {
      const pt = map.latLngToLayerPoint([lat, lng]);
      const px = ((pt.x - nw.x) / w) * 100;
      const py = ((pt.y - nw.y) / h) * 100;
      return `${px.toFixed(2)}% ${py.toFixed(2)}%`;
    });
    const clip = `polygon(${pts.join(", ")})`;
    imgEl.style.clipPath = clip;
    imgEl.style.setProperty("-webkit-clip-path", clip);
  };

  apply();
  const events = ["zoom", "zoomend", "move", "moveend", "viewreset", "resize"] as const;
  for (const ev of events) map.on(ev, apply);

  return () => {
    for (const ev of events) map.off(ev, apply);
    imgEl.style.clipPath = "";
    imgEl.style.removeProperty("-webkit-clip-path");
  };
}

export function parcelleLabelPosition(parcelle: {
  center?: [number, number];
  boundary?: [number, number][];
}): [number, number] | null {
  if (parcelle.boundary && parcelle.boundary.length >= 3) {
    return polygonCentroid(parcelle.boundary);
  }
  return parcelle.center ?? null;
}

/** Évite le doublon parent + sous-parcelles au même endroit */
export function shouldShowParcelleMapLabel(
  parcelle: { children?: unknown[] },
  isChild: boolean
): boolean {
  if (isChild) return true;
  return !parcelle.children?.length;
}

/** Libellé court pour éviter les chevauchements (Nord-A, Maraîchage, …) */
export function parcelleMapMicroLabel(name: string): string {
  const s = parcelleMapShortLabel(name);
  if (s.length <= 10) return s;

  const baseMatch = s.match(/^LA\s+BASE\s+(\d+)$/i);
  if (baseMatch) return `B${baseMatch[1]}`;

  const haMatch = s.match(/^(\d+)\s*Ha\s+(.+)$/i);
  if (haMatch) return `${haMatch[1]}h`;

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const tail = words[words.length - 1];
    if (/^\d+$/.test(tail)) return `${words[0].slice(0, 3)}${tail}`;
    if (words[0].length <= 4) return `${words[0]} ${tail.slice(0, 4)}`;
    return `${words[0].slice(0, 4)}…`;
  }

  return s.length > 8 ? `${s.slice(0, 7)}…` : s;
}

export const COMPACT_SATELLITE_LABEL_THRESHOLD = 6;

export function shouldUseCompactSatelliteLabels(parcelleCount: number): boolean {
  return parcelleCount >= COMPACT_SATELLITE_LABEL_THRESHOLD;
}

export function parcelleMapShortLabel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Sans nom";

  const parts = trimmed.split(" — ");
  if (parts.length >= 2) {
    const head = parts[0].trim();
    if (head.startsWith("Parcelle ")) {
      return parts[1].trim() || head.replace(/^Parcelle\s+/i, "");
    }
    return head;
  }

  return trimmed.length > 24 ? `${trimmed.slice(0, 22)}…` : trimmed;
}

export interface ParcelleLabelStock {
  productCount: number;
  alertCount: number;
}

export type ParcelleLabelSatellite = {
  row: DonneesSatellite;
  index: SatelliteIndexKey;
};

/** Sous-ligne stock affichée sous le nom de la parcelle (vue magasinier). */
export function parcelleStockLineHtml(stock: ParcelleLabelStock): string {
  if (stock.productCount === 0) {
    return `<span class="parc-map-stockline parc-map-stockline--empty">Aucun produit</span>`;
  }
  const status =
    stock.alertCount > 0
      ? `<span class="parc-map-dot parc-map-dot--alert"></span>${stock.alertCount} alerte${stock.alertCount > 1 ? "s" : ""}`
      : `<span class="parc-map-dot parc-map-dot--ok"></span>OK`;
  return `<span class="parc-map-stockline"><b>${stock.productCount}</b>&nbsp;prod.&nbsp;·&nbsp;${status}</span>`;
}

export function parcelleTooltipHtml(
  name: string,
  accentColor = "#203b14",
  stock?: ParcelleLabelStock
): string {
  const safe = escapeMapHtml(parcelleMapShortLabel(name));
  if (!stock) {
    return `<span class="parc-map-tooltip" style="border-color:${accentColor}">${safe}</span>`;
  }

  const state = stock.productCount === 0 ? "empty" : stock.alertCount > 0 ? "warn" : "ok";
  const sub =
    stock.productCount === 0
      ? "Aucun produit"
      : `${stock.productCount} prod. · ${
          stock.alertCount > 0
            ? `${stock.alertCount} alerte${stock.alertCount > 1 ? "s" : ""}`
            : "OK"
        }`;

  return `<span class="parc-map-plabel parc-map-plabel--${state}">
    <span class="parc-map-plabel-name">${safe}</span>
    <span class="parc-map-plabel-sub"><span class="parc-map-dot parc-map-dot--${
      state === "warn" ? "alert" : state === "ok" ? "ok" : "empty"
    }"></span>${sub}</span>
  </span>`;
}

export const parcelleTooltipOptions = {
  permanent: true,
  direction: "center" as const,
  className: "parc-map-tooltip-leaflet",
  opacity: 1,
};

type TooltipLayer = {
  bindTooltip: (content: string, options?: typeof parcelleTooltipOptions) => unknown;
};

export function parcelleSatelliteTooltipHtml(
  name: string,
  satellite: ParcelleLabelSatellite,
  compact = false,
  showAllIndices = false
): string {
  const fullName = parcelleMapShortLabel(name);
  const safe = escapeMapHtml(compact ? parcelleMapMicroLabel(name) : fullName);

  if (showAllIndices) {
    const row = satellite.row;
    const ndvi = row.indice_ndvi;
    const ndwi = row.indice_ndwi;
    const savi = resolveSavi(row);
    const active = satellite.index;

    const chip = (
      label: string,
      val: number | null | undefined,
      kind: "ndvi" | "ndwi" | "savi",
      isActive: boolean
    ) => {
      if (val == null) return "";
      const color =
        kind === "ndwi" ? getNdwiMapColor(val) : getSatelliteMapColor(val, "ndvi");
      const cls = isActive ? " lf-sat-idx--active" : "";
      return `<span class="lf-sat-idx${cls}" style="color:${color}">${label} ${val.toFixed(2)}</span>`;
    };

    const indices = [
      chip("NDVI", ndvi, "ndvi", active === "ndvi"),
      chip("NDWI", ndwi, "ndwi", active === "ndwi"),
      chip("SAVI", savi, "savi", false),
    ]
      .filter(Boolean)
      .join("");

    return `<div class="lf-sat-selected-label">
      <span class="lf-sat-selected-label-name">${safe}</span>
      <div class="lf-sat-selected-label-indices">${indices}</div>
      ${
        row.date_acquisition
          ? `<span class="lf-sat-selected-label-date">${escapeMapHtml(row.date_acquisition.slice(0, 10))}</span>`
          : ""
      }
    </div>`;
  }

  const val = getIndexValue(satellite.row, satellite.index);
  const lvl = getIndexLevel(val, satellite.index);
  const stressed = satellite.index === "ndvi" ? val < 0.55 : val < 0.1;
  const state = stressed ? "warn" : "ok";
  const title = escapeMapHtml(
    `${fullName} · ${satellite.index.toUpperCase()} ${val.toFixed(3)} · ${lvl.label}`
  );

  if (compact) {
    return `<span class="parc-map-sat-chip parc-map-sat-chip--${state}" title="${title}">
      <span class="parc-map-sat-chip-dot" style="background:${lvl.bar}"></span>
      <span class="parc-map-sat-chip-name">${safe}</span>
      <span class="parc-map-sat-chip-val">${val.toFixed(2)}</span>
    </span>`;
  }

  return `<span class="parc-map-plabel parc-map-plabel--sat parc-map-plabel--${state}" title="${title}">
    <span class="parc-map-plabel-name">${safe}</span>
    <span class="parc-map-plabel-sub">
      <span class="parc-map-dot parc-map-dot--${stressed ? "alert" : "ok"}"></span>
      ${satellite.index.toUpperCase()} ${val.toFixed(2)}
    </span>
  </span>`;
}

export function parcelleSatelliteTooltipOptions(compact = false) {
  return {
    permanent: true,
    direction: "center" as const,
    className: compact
      ? "parc-map-tooltip-leaflet parc-map-tooltip-leaflet--compact"
      : "parc-map-tooltip-leaflet parc-map-tooltip-leaflet--sat",
    opacity: 1,
  };
}

export function parcelleSatelliteSelectedTooltipOptions() {
  return {
    permanent: true,
    direction: "center" as const,
    className:
      "parc-map-tooltip-leaflet parc-map-tooltip-leaflet--sat parc-map-tooltip-leaflet--selected",
    opacity: 1,
  };
}

export function parcelleSatelliteLoadingLabelHtml(name: string): string {
  const safe = escapeMapHtml(parcelleMapMicroLabel(name));
  return `<div class="lf-sat-selected-label lf-sat-selected-label--loading">
    <span class="lf-sat-selected-label-name">${safe}</span>
    <span class="lf-sat-selected-label-loading">Chargement API…</span>
  </div>`;
}

export function parcelleSatellitePopupHtml(
  parcelle: {
    id: string;
    name: string;
    cultureType?: string;
    variete?: string;
    areaHectares?: number;
  },
  row: DonneesSatellite
): string {
  const name = escapeMapHtml(parcelleMapShortLabel(parcelle.name));
  const culture = escapeMapHtml(parcelle.cultureType || parcelle.variete || "—");
  const surface =
    parcelle.areaHectares != null ? `${parcelle.areaHectares.toFixed(2)} ha` : "—";

  const ndvi = row.indice_ndvi;
  const ndwi = row.indice_ndwi;
  const savi = resolveSavi(row);
  const ndviColor = ndvi != null ? getSatelliteMapColor(ndvi, "ndvi") : "#888";
  const ndwiColor = ndwi != null ? getNdwiMapColor(ndwi) : "#888";
  const saviColor = savi != null ? getSatelliteMapColor(savi, "ndvi") : "#888";

  const bar = (val: number | null | undefined, color: string, kind: "ndvi" | "ndwi" | "savi" = "ndvi") => {
    if (val == null) return `<span class="lf-sat-bar lf-sat-bar--empty">N/A</span>`;
    const pct = indexBarPercent(val, kind);
    return `<div class="lf-sat-bar"><div class="lf-sat-bar-fill" style="width:${pct}%;background:${color}"></div><span>${val.toFixed(2)}</span></div>`;
  };

  const days = row.date_acquisition
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(row.date_acquisition.slice(0, 10)).getTime()) / 86_400_000
        )
      )
    : null;
  const daysLabel =
    days == null ? "—" : days === 0 ? "aujourd'hui" : days === 1 ? "hier" : `il y a ${days} jours`;
  const cloud =
    row.cloud_cover_pct != null ? `${Math.round(row.cloud_cover_pct)} %` : "—";
  const hydric =
    (ndwi != null && ndwi < 0.1) || (ndvi != null && ndvi < 0.25) ? "OUI" : "NON";
  const status =
    ndvi != null ? escapeMapHtml(getIndexLevel(ndvi, "ndvi").label) : "Non indexé";

  return `<div class="lf-sat-popup">
    <h3 class="lf-sat-popup-title">${name}</h3>
    <p class="lf-sat-popup-status">${status}</p>
    <div class="lf-sat-popup-rows">
      <div class="lf-sat-popup-row"><span>NDVI</span>${bar(ndvi, ndviColor, "ndvi")}</div>
      <div class="lf-sat-popup-row"><span>NDWI</span>${bar(ndwi, ndwiColor, "ndwi")}</div>
      <div class="lf-sat-popup-row"><span>SAVI</span>${bar(savi, saviColor, "savi")}</div>
    </div>
    <div class="lf-sat-popup-meta">
      <p>📅 Dernière image : ${daysLabel}</p>
      <p>☁️ Nuages : ${cloud}</p>
      <p>💧 Stress hydrique : <b>${hydric}</b></p>
      <p>Culture : ${culture} · ${surface}</p>
    </div>
    <a class="lf-sat-popup-link" href="/parcelles?id=${encodeURIComponent(parcelle.id)}">Voir détails →</a>
  </div>`;
}

export function attachParcelleMapLabel(
  layer: TooltipLayer,
  parcelle: { name: string; color?: string; children?: unknown[] },
  isChild: boolean,
  stock?: ParcelleLabelStock,
  forceShow = false,
  satellite?: ParcelleLabelSatellite,
  compactSatellite = false,
  showAllIndices = false
): void {
  if (!forceShow && !shouldShowParcelleMapLabel(parcelle, isChild)) return;
  if (satellite) {
    const html = parcelleSatelliteTooltipHtml(
      parcelle.name,
      satellite,
      compactSatellite,
      showAllIndices
    );
    layer.bindTooltip(
      html,
      showAllIndices
        ? parcelleSatelliteSelectedTooltipOptions()
        : parcelleSatelliteTooltipOptions(compactSatellite)
    );
    return;
  }
  const html = parcelleTooltipHtml(parcelle.name, parcelle.color || "#203b14", stock);
  layer.bindTooltip(html, parcelleTooltipOptions);
}

/** Pastille nom (mode dessin / marqueur sans polygone) */
export function parcelleLabelHtml(name: string, accentColor = "#203b14"): string {
  const safe = escapeMapHtml(parcelleMapShortLabel(name));
  return `<div class="parc-map-label" style="
    position:relative;
    left:0;
    top:0;
    transform:translate(-50%,-50%);
    display:inline-block;
    max-width:140px;
    padding:3px 8px;
    border-radius:9999px;
    background:rgba(10,29,8,0.92);
    border:1px solid ${accentColor};
    color:#f5f8f0;
    font-family:system-ui,-apple-system,sans-serif;
    font-size:10px;
    font-weight:600;
    line-height:1.3;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    box-shadow:0 1px 8px rgba(0,0,0,0.35);
    pointer-events:none;
  ">${safe}</div>`;
}

export function parcelleLabelIconAnchor(): [number, number] {
  return [0, 0];
}

export function parcelleLabelIconSize(): [number, number] {
  return [0, 0];
}
