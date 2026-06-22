import { getSupabaseBrowser } from "@/lib/supabase-browser";

export interface WaProduct {
  name: string;
  quantity: number | null;
  unit: string | null;
  dose_per_1000l: string | null;
}

export interface WaMessage {
  id: string;
  raw_date: string | null;
  sent_at: string | null;
  author: string | null;
  body: string;
  category: string;
  op_date: string | null;
  zone: string | null;
  culture: string | null;
  variete: string | null;
  ph: number | null;
  volume_bouillie: number | null;
  methode: string | null;
  effectif: number | null;
  statut: string | null;
  products: WaProduct[];
  summary: string | null;
}

/** Journal terrain — messages WhatsApp structurés par l'agent IA. */
export async function fetchWaMessages(): Promise<WaMessage[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from("lf_wa_messages")
    .select("id, raw_date, sent_at, author, body, category, op_date, zone, culture, variete, ph, volume_bouillie, methode, effectif, statut, products, summary")
    .order("op_date", { ascending: false, nullsFirst: false })
    .order("sent_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as WaMessage[];
}

export interface IngestResult {
  ok: boolean;
  parsed: number;
  inserted: number;
  skipped: number;
  error?: string;
}

/** Envoie un export WhatsApp brut à l'agent d'extraction. */
export async function ingestWhatsApp(text: string): Promise<IngestResult> {
  const res = await fetch("/api/whatsapp/ingest", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Échec de l'import");
  return json as IngestResult;
}
