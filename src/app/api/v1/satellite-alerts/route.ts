import { NextRequest } from "next/server";
import { withAuthRbac, json, requireFeature } from "@/lib/api-helpers";
import { fetchSatelliteAlerts, markSatelliteAlertRead } from "@/lib/satellite/alerts";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const denied = requireFeature(auth, "satellite");
  if (denied) return denied;

  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";
  const limit = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "30", 10), 1), 100);

  try {
    const data = await fetchSatelliteAlerts(auth.supabase, { unreadOnly, limit });
    return json({ success: true, data, unread: data.filter((a) => !a.lu).length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur lecture alertes";
    return json({ error: msg }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const denied = requireFeature(auth, "satellite");
  if (denied) return denied;

  let body: { id?: string };
  try {
    body = (await req.json()) as { id?: string };
  } catch {
    return json({ error: "Corps JSON invalide" }, 400);
  }

  if (!body.id) return json({ error: "id requis" }, 400);

  try {
    await markSatelliteAlertRead(auth.supabase, body.id);
    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur mise à jour alerte";
    return json({ error: msg }, 500);
  }
}
