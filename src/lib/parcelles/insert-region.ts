import type { SupabaseClient } from "@supabase/supabase-js";

const SCHEMA_COLUMN_RE =
  /Could not find the ['"]?(\w+)['"]? column|column ['"]?(\w+)['"]? of ['"]?regions['"]?/i;

/** Insert with progressive column stripping when PostgREST schema cache is stale. */
export async function insertRegionRow(
  supabase: SupabaseClient,
  row: Record<string, unknown>
) {
  let payload = { ...row };
  let lastError: { message: string; code?: string } | null = null;

  for (let attempt = 0; attempt < 12; attempt++) {
    const result = await supabase.from("regions").insert(payload).select().single();

    if (!result.error) return result;

    lastError = result.error;
    if (result.error.code === "23505") return result;

    const match = result.error.message.match(SCHEMA_COLUMN_RE);
    const missingCol = match?.[1] ?? match?.[2];
    if (!missingCol || !(missingCol in payload)) return result;

    const next = { ...payload };
    delete next[missingCol];
    payload = next;
  }

  return { data: null, error: lastError };
}
