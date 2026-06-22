import type { SupabaseClient } from "@supabase/supabase-js";

export type SatelliteAlertType =
  | "stress_hydrique"
  | "stress_vegetation"
  | "secheresse"
  | "couverture_nuage";

export type SatelliteAlertSeverity = "faible" | "moyen" | "critique";

export type SatelliteAlertRow = {
  id: string;
  parcelle_id: string;
  type_alerte: SatelliteAlertType;
  severite: SatelliteAlertSeverity;
  date_analyse: string;
  ndvi_valeur: number | null;
  ndwi_valeur: number | null;
  message: string;
  lu: boolean;
  created_at: string;
  parcelle_name?: string;
};

export type AlertCandidate = {
  type_alerte: SatelliteAlertType;
  severite: SatelliteAlertSeverity;
  message: string;
};

export function evaluateSatelliteAlerts(input: {
  parcelleName: string;
  ndvi: number | null;
  ndwi: number | null;
  cloudCoverPct?: number | null;
}): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  const { parcelleName, ndvi, ndwi, cloudCoverPct } = input;

  if (ndvi != null) {
    if (ndvi < 0.15) {
      alerts.push({
        type_alerte: "secheresse",
        severite: "critique",
        message: `Sécheresse critique sur ${parcelleName} (NDVI ${ndvi.toFixed(2)}) — audit terrain urgent.`,
      });
    } else if (ndvi < 0.25) {
      alerts.push({
        type_alerte: "secheresse",
        severite: "moyen",
        message: `NDVI très faible sur ${parcelleName} (${ndvi.toFixed(2)}) — irrigation ou traitement recommandé.`,
      });
    } else if (ndvi < 0.4) {
      alerts.push({
        type_alerte: "stress_vegetation",
        severite: "moyen",
        message: `Stress végétation modéré sur ${parcelleName} (NDVI ${ndvi.toFixed(2)}).`,
      });
    } else if (ndvi < 0.55) {
      alerts.push({
        type_alerte: "stress_vegetation",
        severite: "faible",
        message: `Surveillance recommandée sur ${parcelleName} (NDVI ${ndvi.toFixed(2)}).`,
      });
    }
  }

  if (ndwi != null) {
    if (ndwi < -0.1) {
      alerts.push({
        type_alerte: "stress_hydrique",
        severite: "critique",
        message: `Stress hydrique sévère sur ${parcelleName} (NDWI ${ndwi.toFixed(2)}) — irrigation immédiate.`,
      });
    } else if (ndwi < 0) {
      alerts.push({
        type_alerte: "stress_hydrique",
        severite: "moyen",
        message: `Stress hydrique sur ${parcelleName} (NDWI ${ndwi.toFixed(2)}) — irrigation sous 48 h.`,
      });
    } else if (ndwi < 0.1) {
      alerts.push({
        type_alerte: "stress_hydrique",
        severite: "faible",
        message: `Humidité légèrement basse sur ${parcelleName} (NDWI ${ndwi.toFixed(2)}).`,
      });
    }
  }

  if (cloudCoverPct != null && cloudCoverPct > 60) {
    alerts.push({
      type_alerte: "couverture_nuage",
      severite: "faible",
      message: `Couverture nuageuse élevée (${cloudCoverPct.toFixed(0)} %) sur ${parcelleName} — indice peu fiable.`,
    });
  }

  return alerts;
}

export async function upsertSatelliteAlerts(
  supabase: SupabaseClient,
  parcelleId: string,
  parcelleName: string,
  dateAnalyse: string,
  ndvi: number | null,
  ndwi: number | null,
  cloudCoverPct?: number | null
): Promise<number> {
  const candidates = evaluateSatelliteAlerts({
    parcelleName,
    ndvi,
    ndwi,
    cloudCoverPct,
  });

  if (!candidates.length) return 0;

  const rows = candidates.map((c) => ({
    parcelle_id: parcelleId,
    type_alerte: c.type_alerte,
    severite: c.severite,
    date_analyse: dateAnalyse,
    ndvi_valeur: ndvi,
    ndwi_valeur: ndwi,
    message: c.message,
    lu: false,
  }));

  const { error } = await supabase
    .from("satellite_alerts")
    .upsert(rows, { onConflict: "parcelle_id,type_alerte,date_analyse" });

  if (error) {
    if (error.message.includes("satellite_alerts") && error.message.includes("does not exist")) {
      console.warn("[satellite] satellite_alerts table missing — apply migration 046");
      return 0;
    }
    throw new Error(error.message);
  }

  return rows.length;
}

export async function fetchSatelliteAlerts(
  supabase: SupabaseClient,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<SatelliteAlertRow[]> {
  const limit = options?.limit ?? 50;
  let query = supabase
    .from("satellite_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.unreadOnly) query = query.eq("lu", false);

  const { data, error } = await query;
  if (error) {
    if (error.message.includes("satellite_alerts") && error.message.includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as SatelliteAlertRow[];
  const ids = [...new Set(rows.map((r) => r.parcelle_id))];
  if (!ids.length) return rows;

  const nameMap = new Map<string, string>();
  const { data: parcelles } = await supabase.from("parcelles").select("id, nom").in("id", ids);
  for (const p of parcelles ?? []) nameMap.set(p.id, p.nom);

  const { data: regions } = await supabase.from("regions").select("id, name").in("id", ids);
  for (const r of regions ?? []) nameMap.set(r.id, r.name);

  return rows.map((r) => ({
    ...r,
    parcelle_name: nameMap.get(r.parcelle_id),
  }));
}

export async function markSatelliteAlertRead(
  supabase: SupabaseClient,
  alertId: string
): Promise<void> {
  const { error } = await supabase.from("satellite_alerts").update({ lu: true }).eq("id", alertId);
  if (error) throw new Error(error.message);
}
