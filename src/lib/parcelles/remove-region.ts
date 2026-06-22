import type { SupabaseClient } from "@supabase/supabase-js";
import { CANONICAL_PARCELLE_TABLE } from "./constants";

async function collectDescendantRegionIds(
  supabase: SupabaseClient,
  rootId: string
): Promise<string[]> {
  const { data: children, error } = await supabase
    .from(CANONICAL_PARCELLE_TABLE)
    .select("id")
    .eq("parent_id", rootId);

  if (error) throw new Error(error.message);

  const ids: string[] = [];
  for (const child of children || []) {
    ids.push(...(await collectDescendantRegionIds(supabase, child.id)));
    ids.push(child.id);
  }
  return ids;
}

async function clearParcelleReferences(supabase: SupabaseClient, parcelleId: string): Promise<void> {
  const tables = ["treatments", "traitements", "alertes"] as const;
  for (const table of tables) {
    await supabase.from(table).update({ parcelle_id: null }).eq("parcelle_id", parcelleId);
  }
  await supabase.from("donnees_satellite").delete().eq("parcelle_id", parcelleId);
}

async function removeRegionRow(supabase: SupabaseClient, regionId: string): Promise<void> {
  await clearParcelleReferences(supabase, regionId);

  await supabase.from("parcelles").delete().eq("id", regionId);

  const { data, error } = await supabase
    .from(CANONICAL_PARCELLE_TABLE)
    .delete()
    .eq("id", regionId)
    .select("id");

  if (error) throw new Error(error.message);
  if (!data?.length) {
    throw new Error("Suppression refusée — parcelle introuvable ou droits insuffisants");
  }
}

/** Supprime une parcelle canonique (`regions`) et son miroir MCD, avec sous-parcelles. */
export async function removeRegionParcelle(
  supabase: SupabaseClient,
  regionId: string
): Promise<void> {
  const descendantIds = await collectDescendantRegionIds(supabase, regionId);
  for (const id of descendantIds) {
    await removeRegionRow(supabase, id);
  }
  await removeRegionRow(supabase, regionId);
}
