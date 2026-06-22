import { NextRequest, NextResponse } from "next/server";
import { withAuthRbac, requireFeature, json } from "@/lib/api-helpers";
import { fetchParcellePreviewPng, isCdseConfigured } from "@/lib/satellite/cdse-client";
import { loadParcellesWithBoundary } from "@/lib/satellite/repository";
import { isSmallSentinelParcel } from "@/lib/agronome/satellite-utils";

export async function GET(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const denied = requireFeature(auth, "satellite");
  if (denied) return denied;

  if (!isCdseConfigured()) {
    return json({ error: "Copernicus CDSE non configuré" }, 503);
  }

  const parcelleId = req.nextUrl.searchParams.get("parcelleId");
  if (!parcelleId) return json({ error: "parcelleId requis" }, 400);

  const dateParam = req.nextUrl.searchParams.get("date");
  const refDate = dateParam ? new Date(dateParam) : new Date();
  if (Number.isNaN(refDate.getTime())) return json({ error: "date invalide" }, 400);

  const parcelles = await loadParcellesWithBoundary(auth.supabase, parcelleId);
  const parcelle = parcelles[0];
  if (!parcelle) {
    return json({ error: "Parcelle sans contour GPS" }, 404);
  }

  try {
    const small = isSmallSentinelParcel(parcelle.boundary);
    const buffer = await fetchParcellePreviewPng(parcelle.boundary, refDate, 30, {
      smallParcel: small,
    });
    if (!buffer) return json({ error: "Aperçu indisponible" }, 404);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur aperçu Sentinel";
    return json({ error: message }, 502);
  }
}
