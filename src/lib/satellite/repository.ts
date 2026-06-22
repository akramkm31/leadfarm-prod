import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CONFIGURED } from "@/lib/data-provider-config";
import type { DonneesSatellite } from "@/lib/mcd/types";
import { CANONICAL_PARCELLE_TABLE } from "@/lib/parcelles/constants";
import { syncParcelleMirror } from "@/lib/parcelles/sync-mirror";
import { isCdseConfigured } from "@/lib/satellite/cdse-client";
import { fetchSatelliteAlerts, type SatelliteAlertRow } from "@/lib/satellite/alerts";
import type { RegionRow } from "@/lib/database.types";

export type SatelliteMeta = {
  source: "database" | "empty";
  count: number;
  totalParcelles: number;
  parcellesSynced: number;
  cdseConfigured: boolean;
  parcellesWithBoundary: number;
  ready: boolean;
  message?: string;
};

export type SatelliteParcelleEntry = DonneesSatellite & {
  synced: boolean;
  hasBoundary: boolean;
};

export type ParcelleBoundary = {
  id: string;
  name: string;
  boundary: [number, number][];
};

function parseBoundary(row: {
  boundary?: unknown;
  geojson?: unknown;
}): [number, number][] | null {
  if (Array.isArray(row.boundary) && row.boundary.length >= 3) {
    return row.boundary as [number, number][];
  }
  const gj = row.geojson as { type?: string; coordinates?: number[][][] } | null;
  if (gj?.type === "Polygon" && Array.isArray(gj.coordinates?.[0]) && gj.coordinates[0].length >= 3) {
    return gj.coordinates[0].map(([lon, lat]) => [lat, lon] as [number, number]);
  }
  return null;
}

async function enrichParcelleNames(
  supabase: SupabaseClient,
  rows: DonneesSatellite[]
): Promise<DonneesSatellite[]> {
  const ids = [...new Set(rows.map((r) => r.parcelle_id).filter(Boolean))];
  if (!ids.length) return rows;

  const nameMap = new Map<string, string>();
  const { data: regions } = await supabase
    .from(CANONICAL_PARCELLE_TABLE)
    .select("id, name")
    .in("id", ids);
  for (const r of regions || []) nameMap.set(r.id, r.name);

  const missing = ids.filter((id) => !nameMap.has(id));
  if (missing.length) {
    const { data: parcelles } = await supabase
      .from("parcelles")
      .select("id, nom")
      .in("id", missing);
    for (const p of parcelles || []) nameMap.set(p.id, p.nom);
  }

  return rows.map((r) => ({
    ...r,
    parcelle_name: r.parcelle_name || nameMap.get(r.parcelle_id),
  }));
}

function latestPerParcelle(rows: DonneesSatellite[]): DonneesSatellite[] {
  const byParcelle = new Map<string, DonneesSatellite>();
  for (const row of rows) {
    const prev = byParcelle.get(row.parcelle_id);
    if (!prev || row.date_acquisition > prev.date_acquisition) {
      byParcelle.set(row.parcelle_id, row);
    }
  }
  return [...byParcelle.values()].sort((a, b) => b.date_acquisition.localeCompare(a.date_acquisition));
}

function buildMeta(
  count: number,
  parcellesWithBoundary: number,
  cdseConfigured: boolean,
  totalParcelles: number,
  message?: string
): SatelliteMeta {
  const ready = cdseConfigured && parcellesWithBoundary > 0;
  return {
    source: count > 0 || totalParcelles > 0 ? "database" : "empty",
    count,
    totalParcelles,
    parcellesSynced: count,
    cdseConfigured,
    parcellesWithBoundary,
    ready,
    message,
  };
}

async function loadAllParcellesForSatellite(
  supabase: SupabaseClient
): Promise<{ id: string; name: string; hasBoundary: boolean }[]> {
  const byId = new Map<string, { id: string; name: string; hasBoundary: boolean }>();

  const { data: regions, error } = await supabase
    .from(CANONICAL_PARCELLE_TABLE)
    .select("id, name, boundary")
    .order("name");
  if (error) throw new Error(error.message);

  for (const r of regions || []) {
    byId.set(r.id, {
      id: r.id,
      name: r.name,
      hasBoundary: !!parseBoundary(r),
    });
  }

  const { data: parcelles, error: pErr } = await supabase
    .from("parcelles")
    .select("id, nom, geojson")
    .order("nom");
  if (pErr) throw new Error(pErr.message);

  for (const p of parcelles || []) {
    if (byId.has(p.id)) continue;
    byId.set(p.id, {
      id: p.id,
      name: p.nom,
      hasBoundary: !!parseBoundary(p),
    });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

function mergeParcellesWithSatellite(
  parcelles: { id: string; name: string; hasBoundary: boolean }[],
  satelliteRows: DonneesSatellite[]
): SatelliteParcelleEntry[] {
  const byParcelle = new Map<string, DonneesSatellite>();
  for (const row of satelliteRows) {
    byParcelle.set(row.parcelle_id, row);
  }

  const today = new Date().toISOString().slice(0, 10);

  return parcelles.map((p) => {
    const existing = byParcelle.get(p.id);
    if (existing) {
      return {
        ...existing,
        parcelle_name: existing.parcelle_name || p.name,
        synced: true,
        hasBoundary: p.hasBoundary,
      };
    }
    return {
      id: `pending-${p.id}`,
      parcelle_id: p.id,
      parcelle_name: p.name,
      date_acquisition: today,
      indice_ndvi: null,
      indice_ndwi: null,
      synced: false,
      hasBoundary: p.hasBoundary,
    };
  });
}

export async function loadParcellesWithBoundary(
  supabase: SupabaseClient,
  filterParcelleId?: string | null
): Promise<ParcelleBoundary[]> {
  const byId = new Map<string, ParcelleBoundary>();

  let q = supabase.from(CANONICAL_PARCELLE_TABLE).select("id, name, boundary");
  if (filterParcelleId) q = q.eq("id", filterParcelleId);

  const { data: regions, error } = await q;
  if (error) throw new Error(error.message);

  for (const r of regions || []) {
    const boundary = parseBoundary(r);
    if (boundary) byId.set(r.id, { id: r.id, name: r.name, boundary });
  }

  let pq = supabase.from("parcelles").select("id, nom, geojson");
  if (filterParcelleId) pq = pq.eq("id", filterParcelleId);
  const { data: parcelles, error: pErr } = await pq;
  if (pErr) throw new Error(pErr.message);

  for (const p of parcelles || []) {
    if (byId.has(p.id)) continue;
    const boundary = parseBoundary(p);
    if (boundary) byId.set(p.id, { id: p.id, name: p.nom, boundary });
  }

  return [...byId.values()];
}

export async function fetchDonneesSatellite(
  supabase: SupabaseClient | null
): Promise<{ rows: SatelliteParcelleEntry[]; meta: SatelliteMeta }> {
  const cdseConfigured = isCdseConfigured();
  let parcellesWithBoundary = 0;
  let allParcelles: { id: string; name: string; hasBoundary: boolean }[] = [];

  if (!supabase || !SUPABASE_CONFIGURED) {
    return {
      rows: [],
      meta: buildMeta(
        0,
        0,
        cdseConfigured,
        0,
        "Supabase non configuré — définissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY."
      ),
    };
  }

  try {
    allParcelles = await loadAllParcellesForSatellite(supabase);
    parcellesWithBoundary = allParcelles.filter((p) => p.hasBoundary).length;
  } catch (err) {
    console.warn("[satellite] parcelles boundary:", err);
  }

  const { data, error } = await supabase
    .from("donnees_satellite")
    .select("*")
    .order("date_acquisition", { ascending: false })
    .limit(200);

  if (error) {
    console.warn("[satellite] donnees_satellite:", error.message);
    const missingTable =
      error.message.includes("donnees_satellite") &&
      (error.message.includes("schema cache") || error.message.includes("does not exist"));
    const catalog = mergeParcellesWithSatellite(allParcelles, []);
    return {
      rows: catalog,
      meta: buildMeta(
        0,
        parcellesWithBoundary,
        cdseConfigured,
        allParcelles.length,
        missingTable
          ? "Table donnees_satellite absente — appliquez la migration Supabase 040_donnees_satellite_production.sql (Dashboard → SQL ou supabase db push)."
          : `Erreur lecture donnees_satellite : ${error.message}`
      ),
    };
  }

  const enriched = data?.length
    ? await enrichParcelleNames(supabase, data as DonneesSatellite[])
    : [];
  const syncedRows = latestPerParcelle(enriched);
  const rows = mergeParcellesWithSatellite(allParcelles, syncedRows);
  const syncedCount = syncedRows.length;

  if (!syncedCount && allParcelles.length === 0) {
    let message = "Aucune parcelle enregistrée.";
    if (!cdseConfigured) {
      message =
        "Copernicus CDSE non configuré. Ajoutez SENTINEL_HUB_CLIENT_ID et SENTINEL_HUB_CLIENT_SECRET, puis relancez Sync Sentinel-2.";
    }
    return { rows: [], meta: buildMeta(0, 0, cdseConfigured, 0, message) };
  }

  if (!syncedCount) {
    let message = "Aucune acquisition en base.";
    if (!cdseConfigured) {
      message =
        "Copernicus CDSE non configuré. Ajoutez SENTINEL_HUB_CLIENT_ID et SENTINEL_HUB_CLIENT_SECRET (Vercel → Environment Variables), puis relancez Sync Sentinel-2.";
    } else if (parcellesWithBoundary === 0) {
      message =
        "Aucune parcelle avec contour GPS. Définissez les boundaries dans Parcelles, puis cliquez sur Sync Sentinel-2.";
    } else {
      message = `Prêt — ${parcellesWithBoundary} parcelle(s) avec contour. Cliquez sur Sync Sentinel-2 pour récupérer les indices Sentinel-2 L2A.`;
    }
    return {
      rows,
      meta: buildMeta(0, parcellesWithBoundary, cdseConfigured, allParcelles.length, message),
    };
  }

  return {
    rows,
    meta: buildMeta(syncedCount, parcellesWithBoundary, cdseConfigured, allParcelles.length),
  };
}

/** Dernière acquisition par parcelle — source API indices (sans stubs catalogue). */
export async function fetchLatestSatelliteIndices(
  supabase: SupabaseClient
): Promise<DonneesSatellite[]> {
  const { data, error } = await supabase
    .from("donnees_satellite")
    .select("*")
    .order("date_acquisition", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  if (!data?.length) return [];
  const enriched = await enrichParcelleNames(supabase, data as DonneesSatellite[]);
  return latestPerParcelle(enriched);
}

export async function fetchSatelliteMeta(
  supabase: SupabaseClient,
  syncedCount: number
): Promise<SatelliteMeta> {
  const cdseConfigured = isCdseConfigured();
  const allParcelles = await loadAllParcellesForSatellite(supabase);
  const parcellesWithBoundary = allParcelles.filter((p) => p.hasBoundary).length;
  const totalParcelles = allParcelles.length;
  let message: string | undefined;
  if (!cdseConfigured) {
    message =
      "Variables SENTINEL_HUB_CLIENT_ID / SENTINEL_HUB_CLIENT_SECRET non configurées sur le serveur.";
  } else if (parcellesWithBoundary === 0) {
    message = "Aucune parcelle avec contour GPS — éditez les boundaries sur la carte.";
  } else if (syncedCount === 0) {
    message = `Prêt — ${parcellesWithBoundary} parcelle(s) avec contour. Cliquez Sync Sentinel-2.`;
  }
  return buildMeta(syncedCount, parcellesWithBoundary, cdseConfigured, totalParcelles, message);
}

export type SatelliteBundle = {
  meta: SatelliteMeta;
  indices: DonneesSatellite[];
  alerts: SatelliteAlertRow[];
  previews: Record<string, string>;
};

/** Un seul appel : indices, meta, alertes et URLs preview par parcelle. */
export async function fetchSatelliteBundle(supabase: SupabaseClient): Promise<SatelliteBundle> {
  const [indices, alerts] = await Promise.all([
    fetchLatestSatelliteIndices(supabase),
    fetchSatelliteAlerts(supabase),
  ]);
  const meta = await fetchSatelliteMeta(supabase, indices.length);
  const previews: Record<string, string> = {};
  for (const row of indices) {
    if (!row.parcelle_id || !row.date_acquisition || row.indice_ndvi == null) continue;
    const params = new URLSearchParams({
      parcelleId: row.parcelle_id,
      date: row.date_acquisition.slice(0, 10),
    });
    previews[row.parcelle_id] = `/api/v1/satellite-data/preview?${params}`;
  }
  return { meta, indices, alerts, previews };
}

export async function fetchSatelliteHistory(
  supabase: SupabaseClient,
  parcelleId: string,
  limit = 24
): Promise<DonneesSatellite[]> {
  const { data, error } = await supabase
    .from("donnees_satellite")
    .select("*")
    .eq("parcelle_id", parcelleId)
    .order("date_acquisition", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!data?.length) return [];
  return enrichParcelleNames(supabase, data as DonneesSatellite[]);
}

export async function upsertSatelliteRow(
  supabase: SupabaseClient,
  parcelle: ParcelleBoundary,
  stats: {
    date_acquisition: string;
    ndvi_mean: number | null;
    ndvi_min?: number | null;
    ndvi_max?: number | null;
    ndwi_mean?: number | null;
    ndwi_min?: number | null;
    ndwi_max?: number | null;
    evi_mean?: number | null;
    savi_mean?: number | null;
    ndre_mean?: number | null;
    cloud_cover_pct?: number | null;
  },
  exploitationId?: string | null
): Promise<void> {
  const regionRow = {
    id: parcelle.id,
    name: parcelle.name,
    boundary: parcelle.boundary,
  } as RegionRow;
  await syncParcelleMirror(supabase, regionRow, exploitationId ?? undefined);

  await supabase
    .from("donnees_satellite")
    .delete()
    .eq("parcelle_id", parcelle.id)
    .eq("date_acquisition", stats.date_acquisition);

  const { error } = await supabase.from("donnees_satellite").insert({
    parcelle_id: parcelle.id,
    date_acquisition: stats.date_acquisition,
    indice_ndvi: stats.ndvi_mean,
    ndvi_min: stats.ndvi_min ?? null,
    ndvi_max: stats.ndvi_max ?? null,
    indice_ndwi: stats.ndwi_mean ?? null,
    ndwi_min: stats.ndwi_min ?? null,
    ndwi_max: stats.ndwi_max ?? null,
    indice_evi: stats.evi_mean ?? null,
    indice_savi: stats.savi_mean ?? null,
    indice_ndre: stats.ndre_mean ?? null,
    cloud_cover_pct: stats.cloud_cover_pct ?? null,
    source_satellite: "Sentinel-2 L2A (Copernicus CDSE)",
  });

  if (error) throw new Error(error.message);
}
