import type { SupabaseClient } from "@supabase/supabase-js";
import { PARCELLE_FIELDS } from "@/lib/agri-selects";
import { CANONICAL_PARCELLE_TABLE } from "./constants";
import { mapRegionToParcelle } from "./mappers";
import type { RegionRow } from "@/lib/database.types";

export type ResolvedParcelle = {
  id: string;
  source: "parcelles" | "regions";
  /** Row from parcelles (MCD) or null if only region */
  mcd: Record<string, unknown> | null;
  /** Normalized for UI */
  ui: ReturnType<typeof mapRegionToParcelle>;
};

/**
 * Résout un id plantation/parcelle/région vers une entité unifiée (ADR-15).
 */
export async function resolveParcelleById(
  supabase: SupabaseClient,
  id: string
): Promise<ResolvedParcelle | null> {
  const { data: mcd } = await supabase.from("parcelles").select(PARCELLE_FIELDS).eq("id", id).maybeSingle();
  if (mcd) {
    const { data: reg } = await supabase.from(CANONICAL_PARCELLE_TABLE).select("*").eq("id", id).maybeSingle();
    if (reg) {
      return {
        id,
        source: "parcelles",
        mcd: mcd as Record<string, unknown>,
        ui: mapRegionToParcelle(reg as RegionRow),
      };
    }
    return {
      id,
      source: "parcelles",
      mcd: mcd as Record<string, unknown>,
      ui: {
        id,
        name: (mcd as { nom?: string }).nom || id,
        parentId: null,
        exploitationId: "exp-001",
        areaHectares: Number((mcd as { surface_ha?: number }).surface_ha) || 0,
        cropType: (mcd as { culture_actuelle?: string }).culture_actuelle || "",
        variete: (mcd as { variete?: string }).variete || "",
        cultureType: "arboriculture",
        soilType: "Non défini",
        site: "Ferme Principale",
        zone: "Zone",
        secteur: "Secteur",
        irrigation: "aucune",
        center: [0, 0],
        boundary: [],
        color: "#10b981",
        children: [],
        lastTreatmentDate: null,
        treatmentCount: 0,
      },
    };
  }

  const { data: reg } = await supabase.from(CANONICAL_PARCELLE_TABLE).select("*").eq("id", id).maybeSingle();
  if (!reg) return null;

  return {
    id,
    source: "regions",
    mcd: null,
    ui: mapRegionToParcelle(reg as RegionRow),
  };
}
