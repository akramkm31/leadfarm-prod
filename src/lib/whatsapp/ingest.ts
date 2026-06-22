/** Shared ingest: dedup → Claude extraction → upsert into lf_wa_messages.
 *  Used by both the manual paste route and the whapi.cloud webhook. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedMessage } from "./parse";
import { extractMessages, WA_CATEGORIES, type WaCategory } from "./extract";

const isoDate = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const cat = (v: unknown): WaCategory => (WA_CATEGORIES.includes(v as WaCategory) ? (v as WaCategory) : "autre");

export interface IngestCounts {
  parsed: number;
  inserted: number;
  skipped: number;
}

export async function ingestParsedMessages(
  supabase: SupabaseClient,
  apiKey: string,
  parsed: ParsedMessage[]
): Promise<IngestCounts> {
  if (parsed.length === 0) return { parsed: 0, inserted: 0, skipped: 0 };

  const hashes = parsed.map((p) => p.hash);
  const { data: existing } = await supabase
    .from("lf_wa_messages")
    .select("source_hash")
    .in("source_hash", hashes);
  const seen = new Set((existing ?? []).map((r: { source_hash: string }) => r.source_hash));
  const fresh = parsed.filter((p) => !seen.has(p.hash));

  if (fresh.length === 0) return { parsed: parsed.length, inserted: 0, skipped: parsed.length };

  const extractions = await extractMessages(apiKey, fresh);

  const rows = fresh.map((m, i) => {
    const x = extractions.get(i);
    return {
      source_hash: m.hash,
      raw_date: m.rawDate,
      sent_at: m.sentAt,
      author: m.author,
      body: m.body,
      category: x ? cat(x.category) : "info",
      op_date: x ? isoDate(x.op_date) : null,
      zone: x?.zone ?? null,
      culture: x?.culture ?? null,
      variete: x?.variete ?? null,
      ph: x ? num(x.ph) : null,
      volume_bouillie: x ? num(x.volume_bouillie) : null,
      methode: x?.methode ?? null,
      effectif: x?.effectif ?? null,
      statut: x?.statut ?? null,
      products: Array.isArray(x?.products) ? x!.products : [],
      summary: x?.summary ?? m.body.slice(0, 140),
      extracted: x ?? null,
    };
  });

  const { error } = await supabase.from("lf_wa_messages").upsert(rows, { onConflict: "source_hash" });
  if (error) throw new Error(error.message);

  return { parsed: parsed.length, inserted: rows.length, skipped: parsed.length - fresh.length };
}
