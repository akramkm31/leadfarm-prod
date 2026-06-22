/** LeadFarm WhatsApp AI agent — answers stock/treatment queries in French. */

import { createClient } from "@supabase/supabase-js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}

// ─── Tools ────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "get_stock_summary",
    description: "Vue d'ensemble du stock: nombre de produits, alertes bas/critique, péremptions ≤30j.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_low_stock",
    description: "Liste des produits dont le stock est bas ou critique avec quantités restantes.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_expiring_products",
    description: "Produits dont la date de péremption approche.",
    input_schema: {
      type: "object",
      properties: { days: { type: "number", description: "Horizon en jours (défaut 30)" } },
      required: [],
    },
  },
  {
    name: "get_treatments",
    description: "Traitements planifiés ou en cours avec parcelle et date.",
    input_schema: {
      type: "object",
      properties: { status: { type: "string", description: "planned | in_progress | all" } },
      required: [],
    },
  },
  {
    name: "search_product_stock",
    description: "Stock d'un produit spécifique par nom commercial ou matière active.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Nom ou matière active" } },
      required: ["query"],
    },
  },
];

async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  const sb = getSupabase();

  if (name === "get_stock_summary") {
    const { data } = await sb.from("stock_levels").select("status, expiry_date").limit(1000);
    const items = data ?? [];
    const critical = items.filter((i: { status: string }) => i.status === "critical").length;
    const low = items.filter((i: { status: string }) => i.status === "low").length;
    const now = Date.now();
    const expiring = items.filter((i: { expiry_date: string | null }) => {
      if (!i.expiry_date) return false;
      return (new Date(i.expiry_date).getTime() - now) / 86400000 <= 30;
    }).length;
    return JSON.stringify({ total_produits: items.length, critique: critical, bas: low, peremption_30j: expiring });
  }

  if (name === "get_low_stock") {
    const { data } = await sb
      .from("stock_levels")
      .select("current_quantity, unit, status, products(trade_name, active_substance)")
      .in("status", ["low", "critical"])
      .order("current_quantity", { ascending: true })
      .limit(15);
    return JSON.stringify(
      (data ?? []).map((r: Record<string, unknown>) => ({
        produit: (r.products as Record<string, string> | null)?.trade_name ?? "?",
        ma: (r.products as Record<string, string> | null)?.active_substance ?? "",
        quantite: r.current_quantity,
        unite: r.unit,
        statut: r.status,
      }))
    );
  }

  if (name === "get_expiring_products") {
    const days = (input.days as number) ?? 30;
    const cutoff = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
    const { data } = await sb
      .from("stock_levels")
      .select("current_quantity, unit, expiry_date, products(trade_name)")
      .not("expiry_date", "is", null)
      .lte("expiry_date", cutoff)
      .order("expiry_date", { ascending: true })
      .limit(15);
    return JSON.stringify(
      (data ?? []).map((r: Record<string, unknown>) => ({
        produit: (r.products as Record<string, string> | null)?.trade_name ?? "?",
        quantite: r.current_quantity,
        unite: r.unit,
        peremption: r.expiry_date,
      }))
    );
  }

  if (name === "get_treatments") {
    const status = (input.status as string) ?? "planned";
    const statuses = status === "all" ? ["planned", "in_progress", "approved"] : [status, "in_progress"];
    const { data } = await sb
      .from("treatments")
      .select("status, planned_date, parcelles(name), type")
      .in("status", statuses)
      .order("planned_date", { ascending: true })
      .limit(10);
    return JSON.stringify(
      (data ?? []).map((r: Record<string, unknown>) => ({
        parcelle: (r.parcelles as Record<string, string> | null)?.name ?? "?",
        statut: r.status,
        date: r.planned_date,
        type: r.type,
      }))
    );
  }

  if (name === "search_product_stock") {
    const query = (input.query as string).toLowerCase();
    const { data } = await sb
      .from("stock_levels")
      .select("current_quantity, unit, status, expiry_date, products(trade_name, active_substance)")
      .limit(200);
    const filtered = (data ?? []).filter((r: Record<string, unknown>) => {
      const p = r.products as Record<string, string> | null;
      return (
        p?.trade_name?.toLowerCase().includes(query) ||
        p?.active_substance?.toLowerCase().includes(query)
      );
    }).slice(0, 5);
    return JSON.stringify(
      filtered.map((r: Record<string, unknown>) => ({
        produit: (r.products as Record<string, string> | null)?.trade_name ?? "?",
        ma: (r.products as Record<string, string> | null)?.active_substance ?? "",
        quantite: r.current_quantity,
        unite: r.unit,
        statut: r.status,
        peremption: r.expiry_date ?? "-",
      }))
    );
  }

  return JSON.stringify({ error: "Outil inconnu" });
}

// ─── Agentic loop ─────────────────────────────────────────────────────────────

type AnthropicContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

type AnthropicMessage = { role: "user" | "assistant"; content: AnthropicContent[] | string };

async function callAnthropic(messages: AnthropicMessage[], apiKey: string) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 512, system: SYSTEM_PROMPT, tools: TOOLS, messages }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }
  return res.json() as Promise<{ stop_reason: string; content: AnthropicContent[] }>;
}

const SYSTEM_PROMPT = `Tu es l'assistant IA de LeadFarm, une plateforme de gestion phytosanitaire pour le Groupe Lechehab (arboriculture — pommiers, poiriers).
Tu réponds aux questions des équipes via WhatsApp.

Règles:
- Réponds TOUJOURS en français, en moins de 200 mots.
- Sois direct et factuel. Pas de markdown (WhatsApp ne rend pas **gras**).
- Utilise les outils pour accéder aux données réelles.
- Si c'est un rapport terrain (opération effectuée, données saisies), réponds juste: "Message reçu et enregistré."
- Pour les questions sur le stock, les traitements ou les alertes, utilise les outils puis résume clairement.
- Si tu ne peux pas répondre, dis-le simplement.`;

export async function runLeadFarmAgent(userMessage: string, apiKey: string): Promise<string> {
  const messages: AnthropicMessage[] = [{ role: "user", content: userMessage }];

  let response = await callAnthropic(messages, apiKey);

  // Agentic loop — max 3 tool-call rounds
  for (let i = 0; i < 3 && response.stop_reason === "tool_use"; i++) {
    const toolUses = response.content.filter((b) => b.type === "tool_use") as {
      type: "tool_use"; id: string; name: string; input: Record<string, unknown>;
    }[];

    const results: AnthropicContent[] = await Promise.all(
      toolUses.map(async (tu) => ({
        type: "tool_result" as const,
        tool_use_id: tu.id,
        content: await runTool(tu.name, tu.input),
      }))
    );

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: results });

    response = await callAnthropic(messages, apiKey);
  }

  const text = response.content.find((b) => b.type === "text") as { type: "text"; text: string } | undefined;
  return text?.text ?? "Je n'ai pas pu traiter votre demande.";
}
