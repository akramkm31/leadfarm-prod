import { NextRequest } from "next/server";
import { withAuth, requireFeature, json } from "@/lib/api-helpers";
import { fetchDonneesMeteo } from "@/lib/mcd/client";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "meteo");
  if (denied) return denied;
  const exploitationId = req.nextUrl.searchParams.get("exploitation_id") || auth.access.exploitationId || undefined;
  const data = await fetchDonneesMeteo(auth.supabase, exploitationId ?? undefined);
  return json({ success: true, data });
}
