import { NextRequest } from "next/server";
import { withAuth, requireFeature, json } from "@/lib/api-helpers";
import { fetchRecoltes, fetchRevenus, fetchPnlCampagnes } from "@/lib/mcd/client";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "recoltes");
  if (denied) return denied;
  const view = req.nextUrl.searchParams.get("view");
  if (view === "pnl") {
    const pnl = await fetchPnlCampagnes(auth.supabase);
    return json({ success: true, data: pnl });
  }
  const recoltes = await fetchRecoltes(auth.supabase);
  const revenus = await fetchRevenus(auth.supabase);
  return json({ success: true, data: { recoltes, revenus } });
}
