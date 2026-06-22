import { NextRequest } from "next/server";
import { withAuth, json } from "@/lib/api-helpers";
import { parseWhatsApp } from "@/lib/whatsapp/parse";
import { ingestParsedMessages } from "@/lib/whatsapp/ingest";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY non configurée." }, 503);

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corps de requête invalide" }, 400);
  }
  if (!body.text || typeof body.text !== "string") return json({ error: "text requis" }, 400);

  const parsed = parseWhatsApp(body.text);
  if (parsed.length === 0) return json({ error: "Aucun message WhatsApp détecté." }, 422);
  if (parsed.length > 200) parsed.splice(200); // safety cap per request

  try {
    const counts = await ingestParsedMessages(auth.supabase, apiKey, parsed);
    return json({ ok: true, ...counts });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Échec extraction IA" }, 502);
  }
}
