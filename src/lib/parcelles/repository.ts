import { supabase } from "@/lib/supabase";
import { SUPABASE_CONFIGURED } from "@/lib/data-provider-config";
import type { RegionRow } from "@/lib/database.types";
import { CANONICAL_PARCELLE_TABLE } from "./constants";
import { mapRegionToParcelle, type ParcelleUI } from "./mappers";
import { syncParcelleMirror } from "./sync-mirror";

export type { ParcelleUI };

function buildTreatmentStats(treatments: { site_name?: string | null; planned_date?: string | null }[]) {
  const treatmentMap = new Map<string, { count: number; lastDate: string | null }>();
  for (const t of treatments) {
    const key = (t.site_name || "").toLowerCase();
    const existing = treatmentMap.get(key);
    if (existing) {
      existing.count++;
      if (t.planned_date && (!existing.lastDate || t.planned_date > existing.lastDate)) {
        existing.lastDate = t.planned_date;
      }
    } else {
      treatmentMap.set(key, { count: 1, lastDate: t.planned_date ?? null });
    }
  }
  return treatmentMap;
}

export async function fetchParcelles(): Promise<ParcelleUI[]> {
  if (!SUPABASE_CONFIGURED) {
    const { parcelles } = await import("@/lib/mock-data");
    return parcelles as ParcelleUI[];
  }

  try {
    const [regionsRes, treatmentsRes] = await Promise.all([
      supabase.from(CANONICAL_PARCELLE_TABLE).select("*").order("created_at", { ascending: true }),
      supabase.from("treatments").select("site_name, planned_date, parcelle_id").order("planned_date", { ascending: false }),
    ]);
    if (regionsRes.error) throw regionsRes.error;

    const rows = (regionsRes.data || []) as RegionRow[];
    const treatments = treatmentsRes.data || [];
    const treatmentMap = buildTreatmentStats(treatments);

    const childrenByParent = new Map<string, ParcelleUI[]>();
    for (const r of rows.filter((row) => row.parent_id)) {
      const list = childrenByParent.get(r.parent_id!) || [];
      const stats = treatmentMap.get((r.name || "").toLowerCase());
      list.push(mapRegionToParcelle(r, [], stats));
      childrenByParent.set(r.parent_id!, list);
    }

    return rows
      .filter((r) => !r.parent_id)
      .map((r) => {
        const stats = treatmentMap.get((r.name || "").toLowerCase());
        return mapRegionToParcelle(r, childrenByParent.get(r.id) || [], stats);
      });
  } catch (err) {
    console.error("[fetchParcelles]", err);
    const { parcelles } = await import("@/lib/mock-data");
    return parcelles as ParcelleUI[];
  }
}

export async function insertParcelle(data: {
  name: string;
  cropType: string;
  variete: string;
  site: string;
  color: string;
  boundary: [number, number][];
  areaHectares: number;
  center: [number, number];
  parentId?: string | null;
}): Promise<ParcelleUI> {
  if (!SUPABASE_CONFIGURED) {
    const { parcelles } = await import("@/lib/mock-data");
    const newParcelle: ParcelleUI = {
      id: `p-${Date.now()}`,
      name: data.name,
      parentId: null,
      exploitationId: "exp-001",
      areaHectares: data.areaHectares,
      cropType: data.cropType,
      variete: data.variete,
      cultureType: "arboriculture",
      soilType: "Non défini",
      site: data.site,
      zone: "Nouvelle Zone",
      secteur: "Nouveau Secteur",
      irrigation: "aucune",
      center: data.center,
      boundary: data.boundary,
      color: data.color,
      children: [],
      lastTreatmentDate: null,
      treatmentCount: 0,
    };
    (parcelles as ParcelleUI[]).push(newParcelle);
    return newParcelle;
  }

  const { data: region, error } = await supabase
    .from(CANONICAL_PARCELLE_TABLE)
    .insert({
      name: data.name,
      boundary: data.boundary,
      color: data.color,
      area_hectares: data.areaHectares,
      crop_type: data.cropType,
      variete: data.variete,
      site: data.site,
      center: data.center,
      culture_type: "arboriculture",
      parent_id: data.parentId ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message || "Erreur lors de l'enregistrement");

  const regionRow = region as RegionRow;
  await syncParcelleMirror(supabase, regionRow);
  return mapRegionToParcelle(regionRow);
}

export async function updateParcelle(
  id: string,
  data: { name?: string; cropType?: string; color?: string; areaHectares?: number }
): Promise<ParcelleUI | null> {
  if (!SUPABASE_CONFIGURED) return null;

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.cropType !== undefined) updates.crop_type = data.cropType;
  if (data.color !== undefined) updates.color = data.color;
  if (data.areaHectares !== undefined) updates.area_hectares = data.areaHectares;

  const { data: row, error } = await supabase
    .from(CANONICAL_PARCELLE_TABLE)
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  const regionRow = row as RegionRow;
  await syncParcelleMirror(supabase, regionRow);
  return mapRegionToParcelle(regionRow);
}

export async function deleteParcelle(id: string): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return true;

  await supabase.from(CANONICAL_PARCELLE_TABLE).delete().eq("parent_id", id);
  const { error } = await supabase.from(CANONICAL_PARCELLE_TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("parcelles").delete().eq("id", id);
  return true;
}
