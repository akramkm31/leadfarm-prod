import { NextRequest } from "next/server";
import { withAuth, requireFeature, json } from "@/lib/api-helpers";
import { fetchResultats, fetchMesuresAgregees, fetchIaDecisions, fetchApprentissages } from "@/lib/mcd/client";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "resultats");
  if (denied) return denied;
  const scope = req.nextUrl.searchParams.get("scope");
  if (scope === "iot") {
    return json({ success: true, data: await fetchMesuresAgregees(auth.supabase) });
  }
  if (scope === "ia") {
    return json({
      success: true,
      data: {
        decisions: await fetchIaDecisions(auth.supabase),
        apprentissages: await fetchApprentissages(auth.supabase),
      },
    });
  }
  return json({ success: true, data: await fetchResultats(auth.supabase) });
}
