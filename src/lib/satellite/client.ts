import type { DonneesSatellite } from "@/lib/mcd/types";
import type { SatelliteMeta, SatelliteParcelleEntry, SatelliteBundle } from "@/lib/satellite/repository";
import type { SatelliteAlertRow } from "@/lib/satellite/alerts";

type JsonError = { error?: string; hint?: string; detail?: string; message?: string };

async function parseJson<T>(res: Response): Promise<T & JsonError> {
  return (await res.json()) as T & JsonError;
}

export async function fetchSatelliteCatalog(): Promise<{
  data: SatelliteParcelleEntry[];
  meta: SatelliteMeta | null;
}> {
  const res = await fetch("/api/v1/satellite-data", { credentials: "include" });
  const json = await parseJson<{ success?: boolean; data?: SatelliteParcelleEntry[]; meta?: SatelliteMeta }>(res);
  if (!res.ok) throw new Error(json.error || `Erreur HTTP ${res.status}`);
  return { data: Array.isArray(json.data) ? json.data : [], meta: json.meta ?? null };
}

export async function fetchSatelliteBundle(): Promise<SatelliteBundle> {
  const res = await fetch("/api/v1/satellite-data/bundle", { credentials: "include" });
  const json = await parseJson<SatelliteBundle & { success?: boolean; error?: string }>(res);
  if (!res.ok) throw new Error(json.error || `Erreur HTTP ${res.status}`);
  return {
    meta: json.meta,
    indices: Array.isArray(json.indices) ? json.indices : [],
    alerts: Array.isArray(json.alerts) ? json.alerts : [],
    previews: json.previews ?? {},
  };
}

export async function fetchSatelliteIndices(): Promise<{
  data: DonneesSatellite[];
  meta: SatelliteMeta | null;
}> {
  const bundle = await fetchSatelliteBundle();
  return { data: bundle.indices, meta: bundle.meta };
}

/** Map parcelle_id → dernière ligne API (une entrée par parcelle). */
export function indicesByParcelleId(rows: DonneesSatellite[]): Map<string, DonneesSatellite> {
  const map = new Map<string, DonneesSatellite>();
  for (const row of rows) {
    if (row.parcelle_id) map.set(row.parcelle_id, row);
  }
  return map;
}

export type SatelliteParcelleBundle = {
  latest: DonneesSatellite | null;
  history: DonneesSatellite[];
};

export async function fetchSatelliteParcelle(parcelleId: string, limit = 24): Promise<SatelliteParcelleBundle> {
  const params = new URLSearchParams({ parcelleId, limit: String(limit) });
  const res = await fetch(`/api/v1/satellite-data/parcelle?${params}`, { credentials: "include" });
  const json = await parseJson<{ success?: boolean; latest?: DonneesSatellite | null; history?: DonneesSatellite[] }>(res);
  if (!res.ok) throw new Error(json.error || `Erreur HTTP ${res.status}`);
  const history = Array.isArray(json.history) ? json.history : [];
  return {
    latest: json.latest ?? history.at(-1) ?? null,
    history,
  };
}

export async function fetchSatelliteAlerts(unreadOnly = false): Promise<SatelliteAlertRow[]> {
  const params = unreadOnly ? "?unread=1" : "";
  const res = await fetch(`/api/v1/satellite-alerts${params}`, { credentials: "include" });
  const json = await parseJson<{ success?: boolean; data?: SatelliteAlertRow[] }>(res);
  if (!res.ok) throw new Error(json.error || `Erreur HTTP ${res.status}`);
  return Array.isArray(json.data) ? json.data : [];
}

export async function markSatelliteAlertRead(id: string): Promise<void> {
  const res = await fetch("/api/v1/satellite-alerts", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const json = await parseJson<{ error?: string }>(res);
  if (!res.ok) throw new Error(json.error || `Erreur HTTP ${res.status}`);
}

export async function syncSatelliteIngest(options?: {
  parcelleId?: string;
  days?: number;
}): Promise<{ message?: string; processed?: number }> {
  const params = new URLSearchParams();
  if (options?.parcelleId) params.set("parcelle_id", options.parcelleId);
  if (options?.days != null) params.set("days", String(options.days));
  const qs = params.toString();
  const res = await fetch(`/api/v1/satellite-ingest${qs ? `?${qs}` : ""}`, {
    method: "POST",
    credentials: "include",
  });
  const json = await parseJson<JsonError & { success?: boolean; message?: string; processed?: number }>(res);
  if (!res.ok) {
    const hint = json.hint ? ` — ${json.hint}` : "";
    const detail = json.detail ? ` (${json.detail})` : "";
    throw new Error((json.error || "Synchronisation échouée") + detail + hint);
  }
  return { message: json.message, processed: json.processed };
}

export function satellitePreviewUrl(parcelleId: string, date?: string): string {
  const params = new URLSearchParams({ parcelleId });
  if (date) params.set("date", date);
  return `/api/v1/satellite-data/preview?${params}`;
}
