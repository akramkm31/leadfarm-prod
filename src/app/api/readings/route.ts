import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, json } from "@/lib/api-helpers";
import { z } from "zod";

// ─── Supabase service-role client ─────────────────────────────────────────────
// On utilise le service-role pour l'insertion depuis l'ESP32 (RLS ignoré)
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ─── Validation schema ────────────────────────────────────────────────────────
const readingSchema = z.object({
  device_id: z.string().min(1).max(100).default("unknown"),
  flow1: z.number().default(0),
  flow2: z.number().default(0),
  vol1: z.number().nonnegative().default(0),
  vol2: z.number().nonnegative().default(0),
  lat: z.number().min(-90).max(90).default(0),
  lon: z.number().min(-180).max(180).default(0),
  speed: z.number().nonnegative().default(0),
  hdop: z.number().nonnegative().default(99.9),
  sats: z.number().int().nonnegative().default(0),
  area_m2: z.number().nonnegative().default(0),
  /** Timestamp ISO8601 produit par l'ESP32. Sert de clé de déduplication. */
  timestamp: z
    .string()
    .nullable()
    .optional()
    .transform((v) => v ?? new Date().toISOString()),
});

type ReadingInput = z.infer<typeof readingSchema>;

// ─── CORS headers pour ESP32 ──────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-device-key",
};

// ─── OPTIONS (preflight) ──────────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ─── POST — insertion depuis l'ESP32 ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Authentification : clé device OU session cookie
  const deviceKey = req.headers.get("x-device-key");
  const validDeviceKey = process.env.DEVICE_API_KEY;

  const isDeviceAuth = Boolean(deviceKey && validDeviceKey && deviceKey === validDeviceKey);

  if (!isDeviceAuth) {
    const { error: authErr } = await requireAuth(req);
    if (authErr) {
      return new NextResponse(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  // 2. Parse + validation
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new NextResponse(JSON.stringify({ error: "JSON invalide ou corps vide" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const parsed = readingSchema.safeParse(rawBody);
  if (!parsed.success) {
    const messages = parsed.error.issues.map(
      (i) => `${i.path.join(".") || "body"}: ${i.message}`
    );
    return new NextResponse(JSON.stringify({ error: "Validation échouée", details: messages }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const reading: ReadingInput = parsed.data;

  // 3. Insertion avec gestion des doublons (upsert sur device_id + timestamp)
  // Si la même combinaison existe déjà, on met à jour silencieusement.
  try {
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from("device_readings")
      .upsert(reading, {
        onConflict: "device_id,timestamp",
        ignoreDuplicates: false, // met à jour si doublon
      })
      .select("id, device_id, timestamp")
      .single();

    if (error) {
      // Si pas de contrainte unique sur (device_id, timestamp), on tente un insert simple
      if (error.code === "42P10" || error.message?.includes("there is no unique")) {
        const { error: insertErr } = await supabase
          .from("device_readings")
          .insert(reading);

        if (insertErr) {
          console.error("[readings] insert error:", insertErr);
          return new NextResponse(
            JSON.stringify({ error: insertErr.message, code: insertErr.code }),
            { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
          );
        }
        return new NextResponse(
          JSON.stringify({ status: "ok", mode: "insert" }),
          { status: 201, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      console.error("[readings] upsert error:", error);
      return new NextResponse(
        JSON.stringify({ error: error.message, code: error.code }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new NextResponse(
      JSON.stringify({ status: "ok", id: data?.id, mode: "upsert" }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur interne";
    console.error("[readings] fatal:", msg);
    return new NextResponse(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
}

// ─── GET — consultation des dernières lectures ────────────────────────────────
export async function GET(req: NextRequest) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 1), 500);
  const deviceId = searchParams.get("device_id");
  const format = searchParams.get("format"); // "csv" pour export

  try {
    const supabase = getServiceClient();

    let query = supabase
      .from("device_readings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (deviceId) {
      query = query.eq("device_id", deviceId);
    }

    const { data, error } = await query;
    if (error) return json({ error: error.message }, 500);

    // Export CSV
    if (format === "csv") {
      const rows = (data ?? []) as Record<string, unknown>[];
      if (rows.length === 0) {
        return new NextResponse("Aucune donnée", {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="readings_${Date.now()}.csv"`,
          },
        });
      }
      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          headers
            .map((h) => {
              const v = r[h];
              if (v == null) return "";
              const s = String(v);
              return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="readings_${Date.now()}.csv"`,
        },
      });
    }

    return json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur interne";
    return json({ error: msg }, 500);
  }
}
