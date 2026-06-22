import { NextRequest } from "next/server";
import { withAuth, json } from "@/lib/api-helpers";
import { ASSISTANT_TOOLS } from "@/lib/assistant/tools";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

interface AssistantContext {
  pathname?: string;
  pageLabel?: string;
  role?: string;
  roleLabel?: string;
  farmName?: string;
  canCreateTreatment?: boolean;
  canEditStock?: boolean;
  canExecuteTreatment?: boolean;
  profileGuide?: string;
  pageUiHints?: string;
  pages?: { path: string; label: string; description: string }[];
}

function buildSystem(ctx: AssistantContext): string {
  const pages = (ctx.pages ?? [])
    .map((p) => `- ${p.path} — ${p.label} : ${p.description}`)
    .join("\n");
  return `Tu es **Léa**, l'assistante IA de LeadFarm, une plateforme de gestion phytosanitaire (stock de produits ↔ parcelles hiérarchiques ↔ traitements). Tu t'exprimes en français, de façon professionnelle, claire et concise — niveau ingénieur agronome / expert métier senior.

## UTILISATEUR CONNECTÉ
- **Profil** : ${ctx.roleLabel || ctx.role || "utilisateur"} (code : ${ctx.role || "—"})
- **Exploitation** : ${ctx.farmName || "—"}
- **Page ouverte** : ${ctx.pageLabel || "—"} (${ctx.pathname || "—"})

## MISSION & DROITS DE CE PROFIL
${ctx.profileGuide || "(profil non chargé)"}

## INTERFACE DE LA PAGE ACTUELLE
${ctx.pageUiHints || "(pas de guide UI spécifique pour cette page)"}

## CAPACITÉS D'ACTION POUR CE PROFIL
- Créer / planifier un traitement : ${ctx.canCreateTreatment ? "OUI" : "NON — explique qui le fait (directeur / responsable technique)"}
- Modifier le stock (entrées, sorties) : ${ctx.canEditStock ? "OUI" : "NON"}
- Exécuter un traitement terrain : ${ctx.canExecuteTreatment ? "OUI" : "NON"}

## TON RÔLE
1. **Expliquer** : boutons, panneaux, onglets, légendes, FAB, tableaux — le « pourquoi » métier et les étapes concrètes adaptées AU PROFIL CONNECTÉ.
2. **Guider** : proposer le bon parcours (ex. magasinier : action du jour → stock → préparation sortie).
3. **Agir** : naviguer et créer des traitements via les outils (si autorisé).

## RÈGLES D'ACTION
- Pour aller/ouvrir/afficher une page : appelle \`navigate\` avec un chemin de la liste ci-dessous (jamais un autre).
- Pour créer un traitement : si parcelle ou date manquantes, POSE D'ABORD une question courte. Appelle \`list_options\` (kind="parcelles"). Récapitule, puis \`create_treatment\`.
- N'invente jamais de noms de parcelles/produits : utilise \`list_options\`.
- Ne propose que des pages/actions autorisées. Si interdit pour ce profil, explique poliment QUI le fait et QUOI faire à la place.
- En mode aide UI : décris l'élément cliqué, son rôle dans le flux, et si ce profil peut l'utiliser.
- Réponses brèves (2 à 5 phrases) sauf demande d'explication détaillée.

## PAGES AUTORISÉES POUR CE PROFIL
${pages || "(aucune)"}
`;
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: "Assistant indisponible : ANTHROPIC_API_KEY non configurée." }, 503);
  }

  let body: { messages?: unknown; context?: AssistantContext };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corps de requête invalide" }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-24) : [];
  if (messages.length === 0) return json({ error: "messages requis" }, 400);

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: buildSystem(body.context ?? {}),
        tools: ASSISTANT_TOOLS,
        messages,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errData = await upstream.json().catch(() => ({}));
      const msg =
        (errData as { error?: { message?: string } })?.error?.message ||
        (typeof (errData as { error?: string }).error === "string"
          ? (errData as { error: string }).error
          : null) ||
        `Erreur API Anthropic (${upstream.status})`;
      return json({ error: msg }, upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502);
    }

    const upstreamBody = upstream.body;
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const emit = (obj: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        type TextBlock = { type: "text"; text: string };
        type ToolBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
        const blocks: (TextBlock | ToolBlock)[] = [];
        const inputJsonByIndex: Record<number, string> = {};
        let stopReason: string | null = null;

        const reader = upstreamBody.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              try {
                const ev = JSON.parse(raw) as Record<string, unknown>;
                switch (ev.type) {
                  case "content_block_start": {
                    const cb = ev.content_block as { type: string; id?: string; name?: string };
                    const idx = ev.index as number;
                    if (cb.type === "text") blocks[idx] = { type: "text", text: "" };
                    else if (cb.type === "tool_use")
                      blocks[idx] = { type: "tool_use", id: cb.id!, name: cb.name!, input: {} };
                    break;
                  }
                  case "content_block_delta": {
                    const idx = ev.index as number;
                    const delta = ev.delta as { type: string; text?: string; partial_json?: string };
                    if (delta.type === "text_delta" && blocks[idx]?.type === "text") {
                      (blocks[idx] as TextBlock).text += delta.text;
                      emit({ type: "text", text: delta.text });
                    } else if (delta.type === "input_json_delta") {
                      inputJsonByIndex[idx] = (inputJsonByIndex[idx] ?? "") + delta.partial_json;
                    }
                    break;
                  }
                  case "content_block_stop": {
                    const idx = ev.index as number;
                    if (blocks[idx]?.type === "tool_use" && inputJsonByIndex[idx]) {
                      try { (blocks[idx] as ToolBlock).input = JSON.parse(inputJsonByIndex[idx]); } catch { /* keep empty */ }
                    }
                    break;
                  }
                  case "message_delta":
                    stopReason = ((ev.delta as { stop_reason?: string })?.stop_reason) ?? null;
                    break;
                }
              } catch { /* skip malformed */ }
            }
          }
        } catch {
          emit({ type: "error", error: "Erreur de streaming" });
        } finally {
          emit({ type: "done", content: blocks, stop_reason: stopReason });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return json({ error: "Échec de contact avec l'assistant" }, 502);
  }
}
