import { NextRequest } from "next/server";
import { withAuthRbac, json, requireFeature } from "@/lib/api-helpers";
import { fetchSatelliteBundle } from "@/lib/satellite/repository";

/** @deprecated Préférer GET /api/v1/satellite-data/bundle */
export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const denied = requireFeature(auth, "satellite");
  if (denied) return denied;

  if (!auth.supabase) {
    return json({ error: "Supabase non configuré" }, 503);
  }

  try {
    const { meta, indices } = await fetchSatelliteBundle(auth.supabase);
    return json({ success: true, data: indices, meta, count: indices.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur lecture indices satellite";
    return json({ error: msg }, 500);
  }
}
