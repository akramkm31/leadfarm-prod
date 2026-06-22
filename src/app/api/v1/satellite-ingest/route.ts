import { NextRequest } from "next/server";
import { withAuthRbac, json, requireFeature } from "@/lib/api-helpers";
import { fetchParcelleStatsSeries, isCdseConfigured } from "@/lib/satellite/cdse-client";
import { loadParcellesWithBoundary, upsertSatelliteRow } from "@/lib/satellite/repository";
import { upsertSatelliteAlerts } from "@/lib/satellite/alerts";
import {
  expandBoundaryForSentinel,
  isSmallSentinelParcel,
} from "@/lib/agronome/satellite-utils";

const DELAY_MS = 600;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;

  const denied = requireFeature(auth, "satellite");
  if (denied) return denied;

  if (!isCdseConfigured()) {
    return json(
      {
        error: "Copernicus CDSE non configuré",
        hint: "Définissez SENTINEL_HUB_CLIENT_ID et SENTINEL_HUB_CLIENT_SECRET sur le serveur (Vercel → Settings → Environment Variables), puis redéployez.",
        cdseConfigured: false,
      },
      503
    );
  }

  const params = req.nextUrl.searchParams;
  const filterParcelleId = params.get("parcelle_id");
  const daysBack = Math.min(Math.max(parseInt(params.get("days") || "30", 10), 7), 90);
  const dateTo = new Date();

  let parcelles;
  try {
    parcelles = await loadParcellesWithBoundary(auth.supabase, filterParcelleId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur lecture parcelles";
    return json({ error: msg }, 500);
  }

  if (!parcelles.length) {
    return json(
      {
        error: "Aucune parcelle avec contour GPS",
        hint: "Définissez les boundaries des parcelles (Carte & Parcelles → édition du contour).",
      },
      404
    );
  }

  const results = {
    mode: "cdse" as const,
    processed: 0,
    skipped: 0,
    failed: 0,
    alerts: 0,
    intervals: 0,
    parcelles: [] as Array<{ id: string; name: string; status: string; ndvi?: number | null }>,
  };

  for (const parcelle of parcelles) {
    try {
      const small = isSmallSentinelParcel(parcelle.boundary);
      const queryBoundary = expandBoundaryForSentinel(parcelle.boundary);
      const windowDays = small ? Math.max(daysBack, 30) : daysBack;
      const series = await fetchParcelleStatsSeries(queryBoundary, dateTo, windowDays, {
        smallParcel: small,
      });
      if (!series.length) {
        results.skipped++;
        results.parcelles.push({
          id: parcelle.id,
          name: parcelle.name,
          status: small ? "skipped:no_data_small" : "skipped:no_data",
        });
        await sleep(DELAY_MS);
        continue;
      }

      let latestNdvi: number | null = null;
      for (const stats of series) {
        await upsertSatelliteRow(
          auth.supabase,
          parcelle,
          {
            date_acquisition: stats.date_acquisition,
            ndvi_mean: stats.ndvi_mean,
            ndvi_min: stats.ndvi_min,
            ndvi_max: stats.ndvi_max,
            ndwi_mean: stats.ndwi_mean,
            ndwi_min: stats.ndwi_min,
            ndwi_max: stats.ndwi_max,
            evi_mean: stats.evi_mean,
            savi_mean: stats.savi_mean,
            ndre_mean: stats.ndre_mean,
            cloud_cover_pct: stats.cloud_cover_pct,
          },
          auth.access.exploitationId
        );
        results.intervals++;
        latestNdvi = stats.ndvi_mean;

        const alertCount = await upsertSatelliteAlerts(
          auth.supabase,
          parcelle.id,
          parcelle.name,
          stats.date_acquisition,
          stats.ndvi_mean,
          stats.ndwi_mean,
          stats.cloud_cover_pct
        );
        results.alerts += alertCount;
      }

      results.processed++;
      results.parcelles.push({
        id: parcelle.id,
        name: parcelle.name,
        status: "ok",
        ndvi: latestNdvi,
      });
    } catch (err) {
      results.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      results.parcelles.push({
        id: parcelle.id,
        name: parcelle.name,
        status: `error:${msg.slice(0, 120)}`,
      });
    }

    await sleep(DELAY_MS);
  }

  if (results.processed === 0 && results.failed > 0) {
    const firstErr = results.parcelles.find((p) => p.status.startsWith("error:"));
    const detail = firstErr?.status.replace(/^error:/, "") ?? "";
    return json(
      {
        success: false,
        error: "Synchronisation Sentinel-2 échouée pour toutes les parcelles",
        detail: detail || undefined,
        ...results,
      },
      502
    );
  }

  if (results.processed === 0 && results.skipped > 0) {
    return json(
      {
        success: false,
        error: "Aucune image Sentinel-2 exploitable (nuages ou pas d'acquisition récente)",
        hint: "Réessayez dans quelques jours ou réduisez la couverture nuageuse.",
        ...results,
      },
      404
    );
  }

  return json({
    success: true,
    ...results,
    message: `${results.processed} parcelle(s) synchronisée(s) via Sentinel-2 L2A`,
  });
}
