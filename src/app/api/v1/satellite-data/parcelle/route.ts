import { NextRequest } from "next/server";
import { withAuthRbac, json, requireFeature } from "@/lib/api-helpers";
import { fetchSatelliteHistory } from "@/lib/satellite/repository";
import type { DonneesSatellite } from "@/lib/mcd/types";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const denied = requireFeature(auth, "satellite");
  if (denied) return denied;

  const parcelleId = req.nextUrl.searchParams.get("parcelleId");
  if (!parcelleId) {
    return json({ error: "parcelleId requis" }, 400);
  }

  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "24", 10), 1), 90);

  try {
    const history = await fetchSatelliteHistory(auth.supabase, parcelleId, limit);
    const latest: DonneesSatellite | null = history.length ? history[history.length - 1] : null;
    return json({ success: true, latest, history, parcelleId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur lecture parcelle satellite";
    return json({ error: msg }, 500);
  }
}
