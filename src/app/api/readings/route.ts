import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth, json } from "@/lib/api-helpers";
import { z } from "zod";

const readingSchema = z.object({
  device_id: z.string().min(1).max(100).default("unknown"),
  flow1: z.number().default(0),
  flow2: z.number().default(0),
  vol1: z.number().default(0),
  vol2: z.number().default(0),
  lat: z.number().min(-90).max(90).default(0),
  lon: z.number().min(-180).max(180).default(0),
  speed: z.number().nonnegative().default(0),
  hdop: z.number().default(99.9),
  sats: z.number().int().nonnegative().default(0),
  area_m2: z.number().nonnegative().default(0),
  timestamp: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  // Device API key auth (ESP32) — skip cookie auth if valid key
  const deviceKey = req.headers.get("x-device-key");
  const validDeviceKey = process.env.DEVICE_API_KEY;
  if (!deviceKey || deviceKey !== validDeviceKey) {
    const { error: authErr } = await requireAuth(req);
    if (authErr) return authErr;
  }

  try {
    const body = await req.json();
    const parsed = readingSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`);
      return json({ error: "Validation échouée", details: messages }, 400);
    }

    const { error } = await supabase.from("device_readings").insert(parsed.data);
    if (error) return json({ error: error.message }, 500);

    return json({ status: "ok" });
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }
}

export async function GET(req: NextRequest) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const { data, error } = await supabase
    .from("device_readings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return json({ error: error.message }, 500);
  return json(data);
}
