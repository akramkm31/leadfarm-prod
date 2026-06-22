import type { SupabaseClient } from "@supabase/supabase-js";
import type { RegionRow } from "@/lib/database.types";
import { DEFAULT_EXPLOITATION_ID } from "./constants";
import { regionToParcelleMirrorRow } from "./mappers";

/** Maintient `parcelles` (MCD) aligné sur `regions` (canonique UI). */
export async function syncParcelleMirror(
  supabase: SupabaseClient,
  region: RegionRow,
  exploitationId = DEFAULT_EXPLOITATION_ID
) {
  const row = regionToParcelleMirrorRow(region, exploitationId);
  const { error } = await supabase.from("parcelles").upsert(row, { onConflict: "id" });
  if (error) {
    throw new Error(`syncParcelleMirror: ${error.message}`);
  }
}
