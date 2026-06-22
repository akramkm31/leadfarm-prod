/* Pull real messages from the production WhatsApp group via whapi.cloud and
   run them through the same Claude extraction → lf_wa_messages.
   Usage:
     node scripts/pull-whapi-group.cjs probe        # fetch + report only (no AI, no insert)
     node scripts/pull-whapi-group.cjs [count]      # fetch + extract + insert (default 120) */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

(function loadEnv() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "").replace(/\r$/, "");
  }
})();

const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const GROUP = process.env.WHAPI_GROUP_ID || process.env.WHAPI_PRODUCTION_GROUP_ID;
const AKEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const arg = process.argv[2] || "120";
const PROBE = arg === "probe";
const COUNT = PROBE ? 20 : Math.min(parseInt(arg, 10) || 120, 500);

if (!WHAPI_TOKEN || !GROUP) { console.error("Missing WHAPI_TOKEN / group id"); process.exit(1); }

// ── helpers (mirror src/lib/whatsapp) ──
function stableHash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); }
const WA_CATEGORIES = ["traitement", "fertigation", "sortie", "entree", "bon_commande", "statut", "travaux", "info", "autre"];
const SYSTEM = `Tu es l'agent d'extraction terrain de LeadFarm (exploitation arboricole Groupe Lechehab — pommier/poirier, zones : Sfyoun, Mezaourou, Tighalimat, Sidi Ahmed, Kouanka, Carrière, Hadja Fatma, Bougara...). Messages WhatsApp consultant ↔ ingénieurs. Pour CHAQUE message, classe-le et extrais les données.
CATÉGORIES : traitement (pulvérisation foliaire), fertigation (injection/fertilisation engrais), sortie (sortie/consommation stock vers une zone), entree (entrée/retour stock), bon_commande (commande), statut (état phytosanitaire/ravageurs), travaux (éclaircissage/grattage/broyage/désherbage/labour/irrigation), info (conseil/compatibilité/pH/discussion), autre.
RÈGLES : op_date YYYY-MM-DD si présente sinon null ; products=[{name,quantity(nombre),unit,dose_per_1000l(texte)}] ; ph, volume_bouillie(L/ha), methode(aller/retour), effectif, statut, summary(FR court). N'invente rien (null/[]). Appelle record_extractions, un objet par message dans l'ordre (index).`;
const TOOL = { name: "record_extractions", description: "Extraction.", input_schema: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { index: { type: "integer" }, category: { type: "string", enum: WA_CATEGORIES }, op_date: { type: ["string", "null"] }, zone: { type: ["string", "null"] }, culture: { type: ["string", "null"] }, variete: { type: ["string", "null"] }, products: { type: "array", items: { type: "object", properties: { name: { type: "string" }, quantity: { type: ["number", "null"] }, unit: { type: ["string", "null"] }, dose_per_1000l: { type: ["string", "null"] } }, required: ["name"] } }, ph: { type: ["number", "null"] }, volume_bouillie: { type: ["number", "null"] }, methode: { type: ["string", "null"] }, effectif: { type: ["integer", "null"] }, statut: { type: ["string", "null"] }, summary: { type: "string" } }, required: ["index", "category", "products", "summary"] } } }, required: ["items"] } };

async function extractBatch(batch, offset) {
  const numbered = batch.map((m, i) => `### Message ${offset + i}\n[${m.rawDate}] ${m.author}:\n${m.body}`).join("\n\n");
  const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": AKEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: MODEL, max_tokens: 4096, system: SYSTEM, tools: [TOOL], tool_choice: { type: "tool", name: "record_extractions" }, messages: [{ role: "user", content: `Extrais les ${batch.length} messages suivants :\n\n${numbered}` }] }) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Anthropic ${res.status}`);
  return ((data.content || []).find((c) => c.type === "tool_use"))?.input?.items ?? [];
}

(async () => {
  const enc = encodeURIComponent(GROUP);
  const res = await fetch(`https://gate.whapi.cloud/messages/list/${enc}?count=${COUNT}`, { headers: { Authorization: `Bearer ${WHAPI_TOKEN}` } });
  const data = await res.json();
  if (!res.ok) { console.error("whapi error:", JSON.stringify(data)); process.exit(1); }
  const all = data.messages || [];
  const text = all.filter((m) => m.type === "text" && (m.text?.body || "").trim());
  console.log(`Fetched ${all.length} messages (total in chat: ${data.total ?? "?"}) — ${text.length} text`);

  const parsed = text.map((m) => {
    const ts = m.timestamp ? new Date(m.timestamp * 1000) : null;
    const sentAt = ts && !isNaN(ts) ? ts.toISOString() : null;
    return { rawDate: sentAt || String(m.timestamp || ""), sentAt, author: m.from_name || m.from || "WhatsApp", body: m.text.body.trim(), hash: `wa:${stableHash(m.id)}`, from_me: !!m.from_me };
  });

  if (PROBE) {
    console.log("\n--- sample (most recent 8) ---");
    parsed.slice(0, 8).forEach((p) => console.log(`[${p.sentAt?.slice(0, 16) || "?"}] ${p.author}${p.from_me ? " (me)" : ""}: ${p.body.replace(/\n/g, " ").slice(0, 90)}`));
    console.log(`\nPROBE only — no extraction, no insert. Re-run as: node scripts/pull-whapi-group.cjs ${all.length}`);
    return;
  }

  const sb = createClient(URL, KEY, { auth: { persistSession: false } });
  const hashes = parsed.map((p) => p.hash);
  const { data: existing } = await sb.from("lf_wa_messages").select("source_hash").in("source_hash", hashes);
  const seen = new Set((existing || []).map((r) => r.source_hash));
  const fresh = parsed.filter((p) => !seen.has(p.hash));
  console.log(`${fresh.length} new (skipping ${parsed.length - fresh.length} already ingested)`);
  if (fresh.length === 0) return;

  const map = new Map();
  for (let i = 0; i < fresh.length; i += 10) {
    const batch = fresh.slice(i, i + 10);
    process.stdout.write(`  extracting ${i}-${i + batch.length - 1}… `);
    const items = await extractBatch(batch, i);
    for (const it of items) if (typeof it.index === "number") map.set(it.index, it);
    console.log("ok");
  }

  const isoD = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
  const rows = fresh.map((m, i) => { const x = map.get(i) || {}; return { source_hash: m.hash, raw_date: m.rawDate, sent_at: m.sentAt, author: m.author, body: m.body, category: WA_CATEGORIES.includes(x.category) ? x.category : "info", op_date: isoD(x.op_date), zone: x.zone ?? null, culture: x.culture ?? null, variete: x.variete ?? null, ph: typeof x.ph === "number" ? x.ph : null, volume_bouillie: typeof x.volume_bouillie === "number" ? x.volume_bouillie : null, methode: x.methode ?? null, effectif: x.effectif ?? null, statut: x.statut ?? null, products: Array.isArray(x.products) ? x.products : [], summary: x.summary ?? m.body.slice(0, 140), extracted: x }; });
  const { error } = await sb.from("lf_wa_messages").upsert(rows, { onConflict: "source_hash" });
  if (error) { console.error("Insert error:", error.message); process.exit(1); }
  const byCat = rows.reduce((a, r) => ((a[r.category] = (a[r.category] || 0) + 1), a), {});
  console.log(`Inserted ${rows.length}. By category:`, byCat);
})();
