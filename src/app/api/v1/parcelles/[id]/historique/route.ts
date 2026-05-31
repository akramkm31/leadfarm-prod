import { NextRequest } from "next/server";
import { withAuth, requireFeature, json } from "@/lib/api-helpers";
import { findParcelle } from "@/components/map/dashboard-map-utils";
import { buildParcelleHistoryBundle } from "@/lib/parcelle-history";
import { fetchParcelles } from "@/lib/parcelles/repository";
import type { Parcelle } from "@/lib/mock-data";
import { fetchTreatments } from "@/lib/data-provider";
import {
  fetchEvenementsMaladie,
  fetchRecoltes,
  fetchRevenus,
  fetchResultats,
  fetchDonneesSatellite,
} from "@/lib/mcd/client";
import { treatments as mockTreatments, parcelles as mockParcelles } from "@/lib/mock-data";
import { SUPABASE_CONFIGURED } from "@/hooks/useData";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "parcelles.view");
  if (denied) return denied;

  const { id: parcelleId } = await params;

  let parcelles = mockParcelles as Parcelle[];
  let treatments = mockTreatments as unknown as Record<string, unknown>[];

  if (SUPABASE_CONFIGURED) {
    try {
      parcelles = (await fetchParcelles()) as Parcelle[];
    } catch {
      /* mock */
    }
    try {
      treatments = (await fetchTreatments()) as Record<string, unknown>[];
    } catch {
      /* mock */
    }
  }

  const parcelle = findParcelle(parcelles, parcelleId);
  if (!parcelle) {
    return json({ error: "Parcelle introuvable" }, 404);
  }

  const allMaladies = await fetchEvenementsMaladie(auth.supabase);
  const allRecoltes = await fetchRecoltes(auth.supabase);
  const allRevenus = await fetchRevenus(auth.supabase);
  const allResultats = await fetchResultats(auth.supabase);
  const allSatellite = await fetchDonneesSatellite(auth.supabase);

  const matchId = (row: Record<string, unknown>, key = "parcelle_id") =>
    String(row[key] || row.parcelleId || "") === parcelleId;

  const evenementsMaladie = allMaladies.filter((e) => matchId(e as Record<string, unknown>));
  const recoltes = allRecoltes.filter((r) => matchId(r as Record<string, unknown>));
  const recolteIds = new Set(recoltes.map((r) => r.id));
  const revenus = allRevenus.filter(
    (r) =>
      (r.recolte_id && recolteIds.has(r.recolte_id)) ||
      matchId(r as Record<string, unknown>, "campagne_id")
  );
  const resultats = allResultats.filter((r) => matchId(r as Record<string, unknown>));
  const satellite = allSatellite
    .filter((s) => matchId(s as Record<string, unknown>))
    .sort(
      (a, b) =>
        new Date(String(b.date_acquisition)).getTime() -
        new Date(String(a.date_acquisition)).getTime()
    );

  const bundle = buildParcelleHistoryBundle(parcelle, treatments, {
    evenementsMaladie: evenementsMaladie as Record<string, unknown>[],
    recoltes: recoltes as Record<string, unknown>[],
    revenus: revenus as Record<string, unknown>[],
    resultats: resultats as Record<string, unknown>[],
    satellite: satellite as Record<string, unknown>[],
  });

  return json({
    success: true,
    data: {
      parcelle,
      ...bundle,
    },
  });
}
