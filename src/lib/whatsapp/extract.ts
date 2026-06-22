/** Server-only: Claude extraction of structured field-ops from WhatsApp messages. */
import type { ParsedMessage } from "./parse";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export const WA_CATEGORIES = [
  "traitement", "fertigation", "sortie", "entree",
  "bon_commande", "statut", "travaux", "info", "autre",
] as const;
export type WaCategory = (typeof WA_CATEGORIES)[number];

export interface WaExtraction {
  index: number;
  category: WaCategory;
  op_date: string | null;
  zone: string | null;
  culture: string | null;
  variete: string | null;
  products: { name: string; quantity: number | null; unit: string | null; dose_per_1000l: string | null }[];
  ph: number | null;
  volume_bouillie: number | null;
  methode: string | null;
  effectif: number | null;
  statut: string | null;
  summary: string;
}

const SYSTEM = `Tu es l'agent d'extraction terrain de LeadFarm (exploitation arboricole Groupe Lechehab — pommier/poirier, zones : Sfyoun, Mezaourou, Tighalimat, Sidi Ahmed, Kouanka, Carrière, Hadja Fatma, Bougara, Maguer, Hjira...). On te donne des messages WhatsApp d'un groupe consultant ↔ ingénieurs. Pour CHAQUE message fourni, classe-le et extrais les données structurées.

CATÉGORIES (choisis la plus précise) :
- traitement : traitement phytosanitaire foliaire / pulvérisation (mélange de produits + dose /1000L).
- fertigation : injection / fertilisation par irrigation (engrais : DAP, nitrates, sulfate d'ammonium, acides...).
- sortie : sortie de stock / consommation de produits livrés vers une zone (ex. "vers kouanka", livraison Sidi Ahmed, Système V).
- entree : entrée ou retour de stock (ex. "Retour TIGHALIMAT").
- bon_commande : bon de commande / commande de produits.
- statut : état phytosanitaire / observation (ravageurs, maladies : acariens, carpocapse, puceron lanigère...).
- travaux : travaux manuels / mécaniques (éclaircissage, grattage, broyage, désherbage, labour, irrigation, maintenance).
- info : conseil, compatibilité de mélange, pH, question/réponse, discussion.
- autre : sinon.

RÈGLES :
- op_date : la date de l'opération si présente dans le texte (formats 04-06-2026, 05/06/2026, "Le 06/06/2026") → YYYY-MM-DD. Sinon null.
- products : liste des produits/intrants cités avec quantity (nombre) + unit (L, kg, g, ml, sac, gr...) + dose_per_1000l (texte tel quel, ex "0,5L/1000L") quand c'est une dose. Convertis les virgules décimales en points pour quantity.
- ph, volume_bouillie (L/ha), methode (aller/retour), effectif (nombre d'ouvriers), statut (note sanitaire courte) : remplis si présents, sinon null.
- summary : une phrase courte en français résumant le message.
- N'invente rien. Si absent → null (ou [] pour products).
Tu DOIS appeler l'outil record_extractions avec un objet par message, dans le même ordre (index).`;

const TOOL = {
  name: "record_extractions",
  description: "Enregistre l'extraction structurée de chaque message WhatsApp.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer" },
            category: { type: "string", enum: WA_CATEGORIES as unknown as string[] },
            op_date: { type: ["string", "null"] },
            zone: { type: ["string", "null"] },
            culture: { type: ["string", "null"] },
            variete: { type: ["string", "null"] },
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  quantity: { type: ["number", "null"] },
                  unit: { type: ["string", "null"] },
                  dose_per_1000l: { type: ["string", "null"] },
                },
                required: ["name"],
              },
            },
            ph: { type: ["number", "null"] },
            volume_bouillie: { type: ["number", "null"] },
            methode: { type: ["string", "null"] },
            effectif: { type: ["integer", "null"] },
            statut: { type: ["string", "null"] },
            summary: { type: "string" },
          },
          required: ["index", "category", "products", "summary"],
        },
      },
    },
    required: ["items"],
  },
};

async function extractBatch(apiKey: string, batch: ParsedMessage[], offset: number): Promise<WaExtraction[]> {
  const numbered = batch
    .map((m, i) => `### Message ${offset + i}\n[${m.rawDate}] ${m.author}:\n${m.body}`)
    .join("\n\n");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "record_extractions" },
      messages: [{ role: "user", content: `Extrais les ${batch.length} messages suivants :\n\n${numbered}` }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Anthropic ${res.status}`);
  const toolUse = (data.content || []).find((c: { type: string }) => c.type === "tool_use");
  const items: WaExtraction[] = toolUse?.input?.items ?? [];
  return items;
}

/** Extract all messages in batches; returns extractions keyed by absolute index. */
export async function extractMessages(
  apiKey: string,
  messages: ParsedMessage[],
  batchSize = 10
): Promise<Map<number, WaExtraction>> {
  const result = new Map<number, WaExtraction>();
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const items = await extractBatch(apiKey, batch, i);
    for (const it of items) {
      if (typeof it.index === "number" && it.index >= i && it.index < i + batch.length) {
        result.set(it.index, it);
      }
    }
  }
  return result;
}
