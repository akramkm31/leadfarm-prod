import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { json } from "@/lib/api-helpers";
import type { ParsedMessage } from "@/lib/whatsapp/parse";
import { ingestParsedMessages } from "@/lib/whatsapp/ingest";
import { runLeadFarmAgent } from "@/lib/whatsapp/agent";
import { sendWhatsAppReply } from "@/lib/whatsapp/reply";

export const maxDuration = 300;

/** whapi.cloud incoming message (text). */
interface WhapiMessage {
  id: string;
  from_me?: boolean;
  type?: string;
  chat_id?: string;
  chat_name?: string;
  timestamp?: number; // unix seconds
  text?: { body?: string };
  from?: string;
  from_name?: string;
}
interface WhapiPayload {
  messages?: WhapiMessage[];
  event?: { type?: string; event?: string };
  channel_id?: string;
}

const stableHash = (input: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
};

function tokenOk(req: NextRequest): boolean {
  const expected = process.env.WHAPI_WEBHOOK_TOKEN;
  if (!expected) return false; // refuse until a secret is configured
  const got =
    req.nextUrl.searchParams.get("token") ||
    req.headers.get("x-webhook-token") ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return got === expected;
}

/** Verification / health check (whapi "Check webhook"). */
export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (challenge) return new Response(challenge, { status: 200 });
  return json({ ok: true });
}

export async function POST(req: NextRequest) {
  if (!tokenOk(req)) return json({ error: "Webhook non autorisé" }, 401);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY non configurée." }, 503);

  let payload: WhapiPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Corps invalide" }, 400);
  }

  // Only act on new inbound messages; ack everything else.
  if (payload.event?.type !== "messages" || payload.event?.event !== "post") {
    return json({ ok: true, ignored: payload.event?.type ?? "unknown" });
  }

  // Optional: restrict ingestion to one group chat_id.
  // Reuses the same production group the notifications service sends to.
  const onlyGroup = process.env.WHAPI_GROUP_ID || process.env.WHAPI_PRODUCTION_GROUP_ID;
  const incoming = (payload.messages ?? []).filter(
    (m) =>
      !m.from_me &&
      m.type === "text" &&
      !!m.text?.body?.trim() &&
      (!onlyGroup || m.chat_id === onlyGroup)
  );

  if (incoming.length === 0) return json({ ok: true, inserted: 0, skipped: 0 });

  const parsed: ParsedMessage[] = incoming.map((m) => {
    const ts = m.timestamp ? new Date(m.timestamp * 1000) : null;
    const sentAt = ts && !Number.isNaN(ts.getTime()) ? ts.toISOString() : null;
    const rawDate = sentAt ?? String(m.timestamp ?? "");
    const body = m.text!.body!.trim();
    return {
      rawDate,
      sentAt,
      author: m.from_name || m.from || "WhatsApp",
      body,
      // Idempotent on the WhatsApp message id (survives whapi retries).
      hash: `wa:${stableHash(m.id)}`,
    };
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  // Ingest + agent reply in parallel per message
  try {
    const [counts] = await Promise.all([
      ingestParsedMessages(supabase, apiKey, parsed),
      (async () => {
        for (const m of incoming) {
          const body = m.text!.body!.trim();
          const replyTo = m.chat_id || m.from || "";
          if (!replyTo) continue;
          try {
            const reply = await runLeadFarmAgent(body, apiKey);
            await sendWhatsAppReply(replyTo, reply);
          } catch (err) {
            console.error("[Agent reply failed]", err);
          }
        }
      })(),
    ]);
    return json({ ok: true, ...counts });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Échec extraction" }, 502);
  }
}
