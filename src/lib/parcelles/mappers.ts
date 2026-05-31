import type { RegionRow } from "@/lib/database.types";

/** Shape consumed by parcelles UI pages */
export interface ParcelleUI {
  id: string;
  name: string;
  parentId: string | null;
  exploitationId: string;
  areaHectares: number;
  cropType: string;
  variete: string;
  cultureType: string;
  soilType: string;
  site: string;
  zone: string;
  secteur: string;
  irrigation: string;
  center: [number, number];
  boundary: [number, number][];
  color: string;
  children: ParcelleUI[];
  lastTreatmentDate: string | null;
  treatmentCount: number;
}

export function mapRegionToParcelle(
  r: RegionRow | Record<string, unknown>,
  children: ParcelleUI[] = [],
  treatmentStats?: { count: number; lastDate: string | null }
): ParcelleUI {
  const row = r as RegionRow;
  const center = row.center;
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id ?? null,
    exploitationId: "exp-001",
    areaHectares: row.area_hectares ?? 0,
    cropType: row.crop_type || "Non défini",
    variete: row.variete || "",
    cultureType: row.culture_type || "arboriculture",
    soilType: "Non défini",
    site: row.site || "Ferme Principale",
    zone: "Zone",
    secteur: "Secteur",
    irrigation: "aucune",
    center: Array.isArray(center) && center.length >= 2 ? [center[0], center[1]] : [0, 0],
    boundary: (row.boundary as [number, number][]) || [],
    color: row.color || "#10b981",
    children,
    lastTreatmentDate: treatmentStats?.lastDate ?? null,
    treatmentCount: treatmentStats?.count ?? 0,
  };
}

/** Champs MCD `parcelles` pour upsert miroir */
export function regionToParcelleMirrorRow(r: RegionRow, exploitationId: string) {
  const center = r.center;
  const lat = Array.isArray(center) && center.length >= 2 ? Number(center[0]) : null;
  const lng = Array.isArray(center) && center.length >= 2 ? Number(center[1]) : null;
  const code = (r.name || r.id).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 32);

  return {
    id: r.id,
    exploitation_id: exploitationId,
    code_parcelle: code || r.id.slice(0, 8),
    nom: r.name,
    surface_ha: r.area_hectares ?? 0,
    centroide_lat: lat,
    centroide_lng: lng,
    geojson: r.boundary ? { type: "Polygon", coordinates: [r.boundary] } : null,
    culture_actuelle: r.crop_type,
    variete: r.variete,
    statut: "active",
  };
}
