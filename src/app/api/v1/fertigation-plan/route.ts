import { NextRequest } from "next/server";
import { withAuthRbac, json, requireFeature } from "@/lib/api-helpers";
import { fetchFertigationPlan } from "@/lib/fertigation/repository";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const denied = requireFeature(auth, "fertigation");
  if (denied) return denied;

  try {
    const { lines, source } = await fetchFertigationPlan(auth.supabase);
    return json({
      success: true,
      data: lines,
      meta: {
        source,
        count: lines.length,
        message:
          source === "mock"
            ? "Plan démo — appliquez la migration 032 pour les données Tenira réelles"
            : undefined,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur chargement plan";
    return json({ error: msg }, 500);
  }
}
