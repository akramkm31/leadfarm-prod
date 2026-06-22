import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withAuthRbac, requireFeature, json } from "@/lib/api-helpers";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SATELLITE_PROMPT = `Tu es le module d'analyse satellite de LeadFarm. Tu reçois une image satellite d'une parcelle agricole et tu calcules les indices de végétation visibles.

Analyse l'image et retourne UNIQUEMENT ce JSON, sans markdown ni texte :

{
  "ndvi": <-1.0 à 1.0>,
  "ndwi": <-1.0 à 1.0>,
  "evi": <-1.0 à 1.0>,
  "savi": <-1.0 à 1.0>,
  "ndre": <-1.0 à 1.0>,
  "etat_global": "<Excellent|Bon|Moyen|Stressé|Critique>",
  "couverture_vegetale_pct": <0-100>,
  "zones": [
    {
      "label": "<Nord-Est|Sud-Ouest|Centre|etc>",
      "ndvi": <valeur>,
      "etat": "<Excellent|Bon|Moyen|Stressé|Critique>",
      "anomalie": "<description courte ou null>"
    }
  ],
  "stress_hydrique": "<Aucun|Léger|Modéré|Sévère>",
  "stress_nutritionnel": "<Aucun|Léger|Modéré|Sévère>",
  "note_fr": "<observation agronomique d'une phrase sur l'état global>",
  "action_fr": "<recommandation prioritaire pour l'agriculteur>",
  "alerte": "<message d'alerte urgent ou null>"
}

Indices — définitions :
- NDVI  : santé végétale générale       (<0.2 = sol nu, 0.2-0.4 = faible, 0.4-0.6 = moyen, >0.6 = dense)
- NDWI  : teneur en eau foliaire        (<0 = stress hydrique)
- EVI   : végétation en zone dense      (corrige les effets atmosphériques)
- SAVI  : végétation sur sol aride      (adapté Algérie/MENA)
- NDRE  : chlorophylle / azote          (<0.2 = carence azote probable)

Règles :
- Estime les valeurs à partir des couleurs et textures visibles dans l'image (fausses couleurs, infrarouge, ou RGB)
- zones : identifie 2 à 4 zones distinctes dans la parcelle si des différences sont visibles
- alerte : non null uniquement si NDVI < 0.2 ou stress hydrique Sévère ou anomalie critique détectée
- Sois précis et réaliste, ne gonfle pas les valeurs`;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedType = typeof ALLOWED_TYPES[number];

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "satellite");
  if (denied) return denied;

  if (!process.env.ANTHROPIC_API_KEY)
    return json({ success: false, error: "ANTHROPIC_API_KEY non configurée" }, 503);

  let file: File | null = null;
  let cultureName = "";
  let phenoStageCtx = "";
  try {
    const form = await req.formData();
    file = form.get("image") as File | null;
    cultureName  = (form.get("cultureType") as string | null) ?? "";
    phenoStageCtx = (form.get("phenoStage") as string | null) ?? "";
  } catch {
    return json({ success: false, error: "Requête multipart invalide" }, 400);
  }

  if (!file) return json({ success: false, error: "Champ 'image' requis" }, 400);
  if (!ALLOWED_TYPES.includes(file.type as AllowedType))
    return json({ success: false, error: "Format non supporté — JPG, PNG, WebP, GIF uniquement" }, 415);
  if (file.size > 20 * 1024 * 1024)
    return json({ success: false, error: "Image trop grande (max 20 Mo)" }, 413);

  const contextLine = cultureName || phenoStageCtx
    ? `\n\nContexte agronomique : culture = "${cultureName || "non spécifiée"}", stade phénologique = "${phenoStageCtx || "non spécifié"}". Adapte ton analyse et ta recommandation à ce contexte spécifique.`
    : "";

  const bytes  = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    message = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: file.type as AllowedType, data: base64 } },
          { type: "text", text: SATELLITE_PROMPT + contextLine },
        ],
      }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isBalance = msg.includes("credit balance");
    return json(
      { success: false, error: isBalance ? "Solde Anthropic insuffisant — rechargez votre compte" : `Erreur IA: ${msg.slice(0, 200)}` },
      503
    );
  }

  const raw = (message.content[0] as { type: string; text: string }).text.trim();

  let parsed: Record<string, unknown>;
  try {
    const jsonStr = raw.startsWith("{") ? raw : raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(jsonStr);
  } catch {
    return json({ success: false, error: "Réponse IA non parseable", raw }, 502);
  }

  return json({ success: true, data: parsed });
}
