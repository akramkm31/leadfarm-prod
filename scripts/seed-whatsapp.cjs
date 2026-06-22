/* Seed lf_wa_messages from a WhatsApp export using Claude extraction.
   Mirrors src/app/api/whatsapp/ingest + src/lib/whatsapp/*.
   Run: node scripts/seed-whatsapp.cjs [path-to-log.txt] */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

(function loadEnv() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
})();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const AKEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
if (!URL || !KEY || !AKEY) { console.error("Missing SUPABASE / ANTHROPIC env"); process.exit(1); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

// ── parse (mirror of src/lib/whatsapp/parse.ts) ──
const HEADER_RE = /^\[([^\]]+)\]\s*([^:]{1,40}?):\s?(.*)$/;
function stableHash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); }
function toIso(raw) {
  const s = raw.trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?,\s*(\d{1,2}):(\d{2})/);
  if (m) { const y = m[3] ? (m[3].length === 2 ? "20" + m[3] : m[3]) : "2026"; return iso(y, m[2], m[1], m[4], m[5]); }
  m = s.match(/^(\d{1,2}):(\d{2}),\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) { const y = m[5].length === 2 ? "20" + m[5] : m[5]; return iso(y, m[3], m[4], m[1], m[2]); }
  return null;
}
function iso(y, mo, d, h, mi) { const p = (n, w = 2) => String(n).padStart(w, "0"); const v = `${y}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}:00`; return Number.isNaN(Date.parse(v)) ? null : v; }
function parseWhatsApp(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out = []; let cur = null;
  const flush = () => { if (!cur) return; const body = cur.body.join("\n").trim(); if (body) out.push({ rawDate: cur.rawDate, sentAt: toIso(cur.rawDate), author: cur.author.trim(), body, hash: stableHash(`${cur.rawDate}|${cur.author}|${body}`) }); cur = null; };
  for (const line of lines) { const m = line.match(HEADER_RE); if (m) { flush(); cur = { rawDate: m[1], author: m[2], body: m[3] ? [m[3]] : [] }; } else if (cur) cur.body.push(line); }
  flush(); return out;
}

// ── extract (mirror of src/lib/whatsapp/extract.ts) ──
const WA_CATEGORIES = ["traitement", "fertigation", "sortie", "entree", "bon_commande", "statut", "travaux", "info", "autre"];
const SYSTEM = `Tu es l'agent d'extraction terrain de LeadFarm (exploitation arboricole Groupe Lechehab — pommier/poirier, zones : Sfyoun, Mezaourou, Tighalimat, Sidi Ahmed, Kouanka, Carrière, Hadja Fatma, Bougara...). On te donne des messages WhatsApp d'un groupe consultant ↔ ingénieurs. Pour CHAQUE message, classe-le et extrais les données structurées.
CATÉGORIES : traitement (pulvérisation foliaire phyto), fertigation (injection/fertilisation par irrigation : DAP, nitrates, acides...), sortie (sortie/consommation de stock vers une zone), entree (entrée/retour de stock), bon_commande (commande), statut (état phytosanitaire/ravageurs : acariens, carpocapse, puceron...), travaux (éclaircissage, grattage, broyage, désherbage, labour, irrigation), info (conseil/compatibilité/pH/discussion), autre.
RÈGLES : op_date au format YYYY-MM-DD si présente sinon null ; products = [{name, quantity (nombre, virgule->point), unit, dose_per_1000l (texte)}] ; ph, volume_bouillie (L/ha), methode (aller/retour), effectif (ouvriers), statut, summary (phrase FR courte). N'invente rien (null/[]). Appelle l'outil record_extractions, un objet par message dans l'ordre (index).`;
const TOOL = { name: "record_extractions", description: "Extraction structurée.", input_schema: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { index: { type: "integer" }, category: { type: "string", enum: WA_CATEGORIES }, op_date: { type: ["string", "null"] }, zone: { type: ["string", "null"] }, culture: { type: ["string", "null"] }, variete: { type: ["string", "null"] }, products: { type: "array", items: { type: "object", properties: { name: { type: "string" }, quantity: { type: ["number", "null"] }, unit: { type: ["string", "null"] }, dose_per_1000l: { type: ["string", "null"] } }, required: ["name"] } }, ph: { type: ["number", "null"] }, volume_bouillie: { type: ["number", "null"] }, methode: { type: ["string", "null"] }, effectif: { type: ["integer", "null"] }, statut: { type: ["string", "null"] }, summary: { type: "string" } }, required: ["index", "category", "products", "summary"] } } }, required: ["items"] } };

async function extractBatch(batch, offset) {
  const numbered = batch.map((m, i) => `### Message ${offset + i}\n[${m.rawDate}] ${m.author}:\n${m.body}`).join("\n\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": AKEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 4096, system: SYSTEM, tools: [TOOL], tool_choice: { type: "tool", name: "record_extractions" }, messages: [{ role: "user", content: `Extrais les ${batch.length} messages suivants :\n\n${numbered}` }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Anthropic ${res.status}`);
  const tu = (data.content || []).find((c) => c.type === "tool_use");
  return tu?.input?.items ?? [];
}

(async () => {
  const file = process.argv[2] || path.join("scripts", "seed-data", "june-wa-log.txt");
  const text = fs.readFileSync(file, "utf8");
  const parsed = parseWhatsApp(text);
  console.log(`Parsed ${parsed.length} messages`);

  const map = new Map();
  for (let i = 0; i < parsed.length; i += 10) {
    const batch = parsed.slice(i, i + 10);
    process.stdout.write(`  extracting ${i}-${i + batch.length - 1}… `);
    const items = await extractBatch(batch, i);
    for (const it of items) if (typeof it.index === "number") map.set(it.index, it);
    console.log(`ok (${items.length})`);
  }

  const isoD = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
  const rows = parsed.map((m, i) => {
    const x = map.get(i) || {};
    return {
      source_hash: m.hash, raw_date: m.rawDate, sent_at: m.sentAt, author: m.author, body: m.body,
      category: WA_CATEGORIES.includes(x.category) ? x.category : "info",
      op_date: isoD(x.op_date), zone: x.zone ?? null, culture: x.culture ?? null, variete: x.variete ?? null,
      ph: typeof x.ph === "number" ? x.ph : null, volume_bouillie: typeof x.volume_bouillie === "number" ? x.volume_bouillie : null,
      methode: x.methode ?? null, effectif: x.effectif ?? null, statut: x.statut ?? null,
      products: Array.isArray(x.products) ? x.products : [], summary: x.summary ?? m.body.slice(0, 140), extracted: x,
    };
  });

  const { error } = await sb.from("lf_wa_messages").upsert(rows, { onConflict: "source_hash" });
  if (error) { console.error("Insert error:", error.message); process.exit(1); }

  const byCat = rows.reduce((a, r) => ((a[r.category] = (a[r.category] || 0) + 1), a), {});
  console.log(`Inserted/updated ${rows.length} messages`);
  console.log("By category:", byCat);
})();
