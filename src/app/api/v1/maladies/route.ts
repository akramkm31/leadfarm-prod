import { NextRequest } from "next/server";
import { withAuth, requireFeature, json } from "@/lib/api-helpers";
import { fetchMaladies, fetchEvenementsMaladie } from "@/lib/mcd/client";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "maladies");
  if (denied) return denied;
  const includeEvents = req.nextUrl.searchParams.get("events") === "1";
  const maladies = await fetchMaladies(auth.supabase);
  if (!includeEvents) return json({ success: true, data: maladies });
  const evenements = await fetchEvenementsMaladie(auth.supabase);
  return json({ success: true, data: { maladies, evenements } });
}
