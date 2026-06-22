import type { DonneesSatellite } from "@/lib/mcd/types";

export type SatelliteIndexKey = "ndvi" | "ndwi";

export type IndexLevel = {
  min: number;
  max: number;
  label: string;
  short: string;
  color: string;
  bg: string;
  bar: string;
  action: string;
};

export const NDVI_LEVELS: IndexLevel[] = [
  { min: 0.7, max: 1.01, label: "Excellent", short: "Couvert dense", color: "#059669", bg: "#d1fae5", bar: "#10b981", action: "Surveillance routine J+14." },
  { min: 0.55, max: 0.7, label: "Sain", short: "Croissance normale", color: "#16a34a", bg: "#dcfce7", bar: "#22c55e", action: "Fenêtre traitement possible si météo OK." },
  { min: 0.4, max: 0.55, label: "Stress modéré", short: "Surveillance", color: "#d97706", bg: "#fef3c7", bar: "#f59e0b", action: "Diagnostic foliaire sous 7 jours." },
  { min: 0.2, max: 0.4, label: "Stress sévère", short: "Intervention", color: "#ea580c", bg: "#ffedd5", bar: "#f97316", action: "Planifier traitement phyto." },
  { min: -1, max: 0.2, label: "Critique", short: "Hors production", color: "#dc2626", bg: "#fee2e2", bar: "#ef4444", action: "Audit terrain urgent." },
];

export const NDWI_LEVELS: IndexLevel[] = [
  { min: 0.3, max: 1.01, label: "Hydratation optimale", short: "Stress faible", color: "#2563eb", bg: "#dbeafe", bar: "#3b82f6", action: "Irrigation non requise." },
  { min: 0.1, max: 0.3, label: "Normal", short: "Humidité OK", color: "#0284c7", bg: "#e0f2fe", bar: "#38bdf8", action: "Surveiller si chaleur persistante." },
  { min: 0, max: 0.1, label: "Légèrement sec", short: "À surveiller", color: "#ca8a04", bg: "#fef9c3", bar: "#eab308", action: "Prévoir irrigation." },
  { min: -0.1, max: 0, label: "Stress hydrique", short: "Irrigation", color: "#d97706", bg: "#fef3c7", bar: "#f59e0b", action: "Irrigation sous 48 h." },
  { min: -1, max: -0.1, label: "Stress sévère", short: "Urgent", color: "#dc2626", bg: "#fee2e2", bar: "#ef4444", action: "Irrigation immédiate." },
];

export function getIndexValue(row: DonneesSatellite, index: SatelliteIndexKey): number {
  return index === "ndvi" ? (row.indice_ndvi ?? 0) : (row.indice_ndwi ?? 0);
}

export function hasSatelliteIndexValue(
  row: DonneesSatellite | undefined | null,
  index: SatelliteIndexKey
): boolean {
  if (!row) return false;
  return index === "ndvi" ? row.indice_ndvi != null : row.indice_ndwi != null;
}

export function getIndexLevel(value: number, index: SatelliteIndexKey): IndexLevel {
  const levels = index === "ndvi" ? NDVI_LEVELS : NDWI_LEVELS;
  // Levels are sorted high→low by min; first match where value >= min is correct bucket
  return levels.find((l) => value >= l.min) ?? levels[levels.length - 1];
}

export function ndviStrokeColor(value: number): string {
  return getSatelliteMapColor(value, "ndvi");
}

/** Ramp couleur carte satellite (semi-aride) */
export function getSatelliteMapColor(
  value: number | null | undefined,
  index: SatelliteIndexKey = "ndvi"
): string {
  if (value == null || !Number.isFinite(value)) return "#888888";

  if (index === "ndwi") {
    return getNdwiMapColor(value);
  }

  if (value < 0.15) return "#cc1a1a";
  if (value < 0.25) return "#e85d00";
  if (value < 0.35) return "#e8a400";
  if (value < 0.5) return "#a8cc00";
  if (value < 0.65) return "#4aaa00";
  return "#007a00";
}

/** Ramp NDWI — sol sec (semi-aride) → rouge/orange, humide → bleu/vert */
export function getNdwiMapColor(ndwi: number | null | undefined): string {
  if (ndwi == null || !Number.isFinite(ndwi)) return "#888888";
  if (ndwi > 0.3) return "#0066cc";
  if (ndwi > 0) return "#4aaa00";
  if (ndwi > -0.2) return "#e8a400";
  if (ndwi > -0.4) return "#e85d00";
  return "#cc1a1a";
}

/** SAVI depuis la ligne DB, ou estimation NDVI×1.15 si absent / 0 avec végétation */
export function resolveSavi(row: DonneesSatellite | null | undefined): number | null {
  if (!row) return null;
  const savi = row.indice_savi;
  const ndvi = row.indice_ndvi;
  if (savi != null && savi > 0.001) return savi;
  if (ndvi != null && ndvi > 0.05) return Math.round(ndvi * 1.15 * 1000) / 1000;
  return null;
}

export function formatSatelliteIndexDisplay(
  value: number | null | undefined,
  kind: "ndvi" | "ndwi" | "savi",
  row?: DonneesSatellite | null
): string {
  if (kind === "savi") {
    const resolved = row ? resolveSavi(row) : value != null && value > 0.001 ? value : null;
    return resolved != null ? resolved.toFixed(2) : "N/A";
  }
  if (value == null || !Number.isFinite(value)) return "N/A";
  return value.toFixed(2);
}

/** Barre 0–100 % pour affichage (NDWI normalisé sur [-1, 1]) */
export function indexBarPercent(value: number | null | undefined, kind: "ndvi" | "ndwi" | "savi"): number {
  if (value == null || !Number.isFinite(value)) return 0;
  if (kind === "ndwi") return Math.round(((value + 1) / 2) * 100);
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

export function imageAgeTone(days: number | null): "fresh" | "aging" | "stale" {
  if (days == null) return "stale";
  if (days <= 5) return "fresh";
  if (days <= 10) return "aging";
  return "stale";
}

/** Sentinel-2 revisit ~5–10 j ; prochaine acquisition estimée */
export function estimateNextAcquisitionDays(daysSinceLast: number | null): number {
  if (daysSinceLast == null) return 5;
  const cycle = 10;
  const next = cycle - (daysSinceLast % cycle);
  return next <= 0 ? cycle : next;
}

export const MIN_SENTINEL_PARCEL_HA = 0.5;

/** Surface approximative (ha) depuis un contour [lat, lng]. */
export function estimateBoundaryAreaHa(boundary: [number, number][]): number {
  if (boundary.length < 3) return 0;
  const lat0 = boundary.reduce((s, [lat]) => s + lat, 0) / boundary.length;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const pts = boundary.map(([lat, lng]) => ({
    x: lng * mPerDegLng,
    y: lat * mPerDegLat,
  }));
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2 / 10_000;
}

export function isSmallSentinelParcel(
  boundary: [number, number][],
  areaHa?: number | null
): boolean {
  const ha = areaHa ?? estimateBoundaryAreaHa(boundary);
  return ha > 0 && ha < MIN_SENTINEL_PARCEL_HA;
}

/** Agrandit légèrement les micro-parcelles pour atteindre la résolution Sentinel-2 (10 m). */
export function expandBoundaryForSentinel(
  boundary: [number, number][],
  minHa = MIN_SENTINEL_PARCEL_HA
): [number, number][] {
  const current = estimateBoundaryAreaHa(boundary);
  if (current >= minHa) return boundary;
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
  const clat = (minLat + maxLat) / 2;
  const clng = (minLng + maxLng) / 2;
  const scale = Math.sqrt(minHa / Math.max(current, 0.005));
  return boundary.map(([lat, lng]) => [
    clat + (lat - clat) * scale,
    clng + (lng - clng) * scale,
  ]);
}

export function ndviLegendColor(ndvi: number | null | undefined): string {
  if (ndvi == null || !Number.isFinite(ndvi)) return "#cbd5e1";
  for (const item of NDVI_MAP_LEGEND) {
    if (item.range.startsWith("≥")) {
      if (ndvi >= parseFloat(item.range.slice(2))) return item.color;
      continue;
    }
    if (item.range.startsWith("<")) {
      if (ndvi < parseFloat(item.range.slice(2))) return item.color;
      continue;
    }
    const [lo, hi] = item.range.split("–").map((s) => parseFloat(s.trim()));
    if (ndvi >= lo && ndvi < hi) return item.color;
  }
  return NDVI_MAP_LEGEND[2]?.color ?? "#a8cc00";
}

export const NDVI_MAP_LEGEND = [
  { color: "#007a00", label: "Excellent", range: "≥ 0.65" },
  { color: "#4aaa00", label: "Bon", range: "0.50 – 0.65" },
  { color: "#a8cc00", label: "Moyen", range: "0.35 – 0.50" },
  { color: "#e8a400", label: "Faible", range: "0.25 – 0.35" },
  { color: "#e85d00", label: "Stress", range: "0.15 – 0.25" },
  { color: "#cc1a1a", label: "Critique", range: "< 0.15" },
] as const;

export function getSatelliteStatusLabel(value: number | null | undefined, index: SatelliteIndexKey): string {
  if (value == null) return "Non indexé";
  return getIndexLevel(value, index).label;
}

export function isHydricStress(row: DonneesSatellite): boolean {
  const ndwi = row.indice_ndwi;
  const ndvi = row.indice_ndvi;
  return (ndwi != null && ndwi < 0.1) || (ndvi != null && ndvi < 0.25);
}

export function daysSinceAcquisition(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr.slice(0, 10));
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export function isStressed(value: number, index: SatelliteIndexKey): boolean {
  return index === "ndvi" ? value < 0.55 : value < 0.1;
}

export function sortByStress(rows: DonneesSatellite[], index: SatelliteIndexKey): DonneesSatellite[] {
  return [...rows].sort((a, b) => getIndexValue(a, index) - getIndexValue(b, index));
}

export type SatelliteCatalogEntry = DonneesSatellite & {
  synced?: boolean;
  hasBoundary?: boolean;
};

export function hasSatelliteIndex(entry: SatelliteCatalogEntry | undefined | null): boolean {
  return !!entry && entry.synced !== false && entry.indice_ndvi != null;
}

export type ParcelleWithSatellite = {
  parcelle: { id: string; name: string; color?: string; variete?: string; areaHectares?: number; cultureType?: string };
  entry: SatelliteCatalogEntry;
};

/** Parcelles (parents + enfants) ayant des indices synchronisés. */
export function listParcellesWithIndices(
  parcelles: ParcelleNode[],
  lookup: Map<string, SatelliteCatalogEntry>
): ParcelleWithSatellite[] {
  const items: ParcelleWithSatellite[] = [];
  for (const p of parcelles) {
    const pEntry = lookup.get(p.id);
    if (hasSatelliteIndex(pEntry)) {
      items.push({
        parcelle: p,
        entry: { ...pEntry!, parcelle_name: p.name },
      });
    }
    for (const c of p.children || []) {
      const cEntry = lookup.get(c.id);
      if (hasSatelliteIndex(cEntry)) {
        items.push({
          parcelle: c,
          entry: { ...cEntry!, parcelle_name: c.name },
        });
      }
    }
  }
  return items.sort(
    (a, b) => getIndexValue(a.entry, "ndvi") - getIndexValue(b.entry, "ndvi")
  );
}

/** Lookup id → ligne satellite (catalogue API + héritage parent → enfant). */
export function buildSatelliteCatalogLookup(
  parcelles: ParcelleNode[],
  catalog: SatelliteCatalogEntry[]
): Map<string, SatelliteCatalogEntry> {
  const byParcelleId = new Map<string, SatelliteCatalogEntry>();
  for (const row of catalog) {
    byParcelleId.set(row.parcelle_id, row);
  }

  const synced = catalog.filter((r) => r.synced !== false);
  const inherited = buildSatelliteLookup(parcelles, synced);

  const result = new Map<string, SatelliteCatalogEntry>();

  const visit = (nodes: ParcelleNode[]) => {
    for (const p of nodes) {
      const direct = byParcelleId.get(p.id);
      if (direct) {
        result.set(p.id, direct);
      } else {
        const inh = inherited.get(p.id);
        if (inh) {
          result.set(p.id, {
            ...inh,
            synced: true,
            hasBoundary: byParcelleId.get(p.id)?.hasBoundary,
          });
        } else {
          const pending = byParcelleId.get(p.id);
          if (pending) result.set(p.id, pending);
        }
      }
      if (p.children?.length) visit(p.children);
    }
  };

  visit(parcelles);
  for (const row of catalog) {
    if (!result.has(row.parcelle_id)) result.set(row.parcelle_id, row);
  }
  return result;
}

/** Synced parcelles by stress (NDVI asc), then unsynced alphabetically. */
export function sortSatelliteCatalog(rows: SatelliteCatalogEntry[]): SatelliteCatalogEntry[] {
  return [...rows].sort((a, b) => {
    const aSynced = a.synced !== false;
    const bSynced = b.synced !== false;
    if (aSynced !== bSynced) return aSynced ? -1 : 1;
    if (!aSynced) {
      return (a.parcelle_name || a.parcelle_id).localeCompare(
        b.parcelle_name || b.parcelle_id,
        "fr"
      );
    }
    return getIndexValue(a, "ndvi") - getIndexValue(b, "ndvi");
  });
}

/** All parcelles (parents + children) for the grid — synced first (NDVI asc), then unsynced alpha. */
export function listAllParcellesForGrid(
  parcelles: ParcelleNode[],
  lookup: Map<string, SatelliteCatalogEntry>
): ParcelleWithSatellite[] {
  const items: ParcelleWithSatellite[] = [];
  const visit = (nodes: ParcelleNode[]) => {
    for (const p of nodes) {
      const found = lookup.get(p.id);
      items.push({
        parcelle: p,
        entry: found ?? ({
          id: `stub-${p.id}`,
          parcelle_id: p.id,
          parcelle_name: p.name,
          date_acquisition: "",
          indice_ndvi: null,
          indice_ndwi: null,
          synced: false,
        } as unknown as SatelliteCatalogEntry),
      });
      if (p.children?.length) visit(p.children);
    }
  };
  visit(parcelles);
  return items.sort((a, b) => {
    const aS = hasSatelliteIndex(a.entry);
    const bS = hasSatelliteIndex(b.entry);
    if (aS !== bS) return aS ? -1 : 1;
    if (!aS) return a.parcelle.name.localeCompare(b.parcelle.name, "fr");
    return getIndexValue(a.entry, "ndvi") - getIndexValue(b.entry, "ndvi");
  });
}

export function averageIndex(rows: DonneesSatellite[], index: SatelliteIndexKey): number | null {
  if (!rows.length) return null;
  return rows.reduce((s, r) => s + getIndexValue(r, index), 0) / rows.length;
}

export function satelliteByParcelleId(
  rows: DonneesSatellite[]
): Map<string, DonneesSatellite> {
  const m = new Map<string, DonneesSatellite>();
  rows.forEach((r) => m.set(r.parcelle_id, r));
  return m;
}

function normalizeParcelleKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

type ParcelleNode = { id: string; name: string; children?: ParcelleNode[] };

/** Associe indices satellite aux parcelles affichées (id ou nom). Pas de données synthétiques en production. */
export function alignSatelliteToParcelles(
  parcelles: ParcelleNode[],
  rows: DonneesSatellite[],
  options?: { allowSynthetic?: boolean }
): DonneesSatellite[] {
  if (!parcelles.length) return rows;

  const allowSynthetic = options?.allowSynthetic ?? false;
  const byId = satelliteByParcelleId(rows);
  const byName = new Map<string, DonneesSatellite>();
  rows.forEach((r) => {
    if (r.parcelle_name) byName.set(normalizeParcelleKey(r.parcelle_name), r);
  });

  const parents = parcelles.filter((p) => !("parentId" in p) || !(p as { parentId?: string }).parentId);
  const list = parents.length ? parents : parcelles;

  if (!rows.length) {
    if (!allowSynthetic) return [];
    return list.map((p, i) => ({
      id: `sat-${p.id}`,
      parcelle_id: p.id,
      parcelle_name: p.name,
      date_acquisition: new Date().toISOString().slice(0, 10),
      indice_ndvi: 0.42 + (i % 6) * 0.05,
      indice_ndwi: 0.05 + (i % 5) * 0.06,
    }));
  }

  return list.flatMap((p, index) => {
    const matched =
      byId.get(p.id) ??
      byName.get(normalizeParcelleKey(p.name)) ??
      (allowSynthetic ? rows[index % Math.max(rows.length, 1)] : null);

    if (!matched) return [];

    return [{
      ...matched,
      id: matched.id || `sat-${p.id}`,
      parcelle_id: p.id,
      parcelle_name: p.name,
    }];
  });
}

/** Lookup carte : parcelle id → ligne satellite (héritage parent → enfant). */
export function buildSatelliteLookup(
  parcelles: ParcelleNode[],
  rows: DonneesSatellite[]
): Map<string, DonneesSatellite> {
  const aligned = alignSatelliteToParcelles(parcelles, rows);
  const map = satelliteByParcelleId(aligned);

  const inherit = (p: ParcelleNode) => {
    const row = map.get(p.id);
    p.children?.forEach((child) => {
      if (!map.has(child.id) && row) {
        map.set(child.id, {
          ...row,
          parcelle_id: child.id,
          parcelle_name: child.name,
        });
      }
      inherit(child);
    });
  };

  parcelles.forEach(inherit);
  return map;
}

/** Lookup carte strictement depuis l’API (pas d’alignement ni héritage). */
export function buildDirectSatelliteLookup(rows: DonneesSatellite[]): Map<string, DonneesSatellite> {
  const map = new Map<string, DonneesSatellite>();
  for (const row of rows) {
    if (row.parcelle_id) map.set(row.parcelle_id, row);
  }
  return map;
}

const PHENO_STAGES: Record<string, string[]> = {
  arboriculture: ["Dormance","Débourrement","Croissance végétative","Floraison","Nouaison","Développement","Grossissement","Maturité","Récolte","Post-récolte","Chute des feuilles","Repos hivernal"],
  cereales:      ["Tallage","Repos hivernal","Reprise végétation","Montaison","Épiaison","Floraison","Grain laiteux","Maturation","Récolte","Chaume","Travail du sol","Semis"],
  viticulture:   ["Dormance","Pleurs","Débourrement","Croissance","Floraison","Nouaison","Fermeture grappe","Véraison","Maturation","Récolte","Post-vendange","Chute feuilles"],
  oleiculture:   ["Repos","Reprise végétation","Floraison","Nouaison","Croissance olive","Grossissement","Maturation verte","Maturité","Récolte","Post-récolte","Repos","Repos"],
  agrumes:       ["Repos","Floraison","Floraison","Nouaison","Croissance","Grossissement","Maturité","Récolte","Récolte","Post-récolte","Repos","Repos"],
  maraichage:    ["Préparation sol","Semis/plantation","Levée","Croissance","Développement","Récolte","Récolte","Interculture","Semis automne","Croissance","Croissance","Récolte"],
};

export function getPhenologicalStage(cultureType: string | null | undefined, month: number): string {
  const stages = PHENO_STAGES[cultureType ?? ""] ?? PHENO_STAGES.arboriculture;
  return stages[(month - 1) % 12];
}

export function estimateWaterDeficit(ndwi: number | null | undefined): number | null {
  if (ndwi == null || !Number.isFinite(ndwi)) return null;
  if (ndwi >= 0.1) return 0;
  return Math.round(Math.max(0, (0.1 - ndwi) * 80));
}
