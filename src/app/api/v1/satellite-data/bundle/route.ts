import { NextRequest } from "next/server";
import { withAuthRbac, json, requireFeature } from "@/lib/api-helpers";
import { fetchSatelliteBundle } from "@/lib/satellite/repository";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const denied = requireFeature(auth, "satellite");
  if (denied) return denied;

  if (!auth.supabase) {
    return json({ error: "Supabase non configuré" }, 503);
  }

  try {
    const bundle = await fetchSatelliteBundle(auth.supabase);
    return json({ success: true, ...bundle, count: bundle.indices.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur chargement satellite";
    return json({ error: msg }, 500);
  }
}
