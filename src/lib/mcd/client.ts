/**
 * Client données MCD — Supabase avec repli mock.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_CONFIGURED } from "@/lib/data-provider";
import * as mock from "./mock-data";
import type {
  Apprentissage,
  DonneesMeteo,
  DonneesSatellite,
  EvenementMaladie,
  IaDecision,
  Maladie,
  MesureAgregee,
  MicroZone,
  PnlCampagne,
  Protocole,
  Recolte,
  Resultat,
  Revenu,
  TenantUser,
  TypeEvenement,
} from "./types";

async function fromTable<T>(
  supabase: SupabaseClient | null,
  table: string,
  fallback: T[],
  order?: { column: string; ascending?: boolean }
): Promise<T[]> {
  if (!supabase || !SUPABASE_CONFIGURED) return fallback;
  let q = supabase.from(table).select("*");
  if (order) q = q.order(order.column, { ascending: order.ascending ?? false });
  const { data, error } = await q;
  if (error || !data?.length) return fallback;
  return data as T[];
}

export async function fetchTypeEvenements(supabase: SupabaseClient | null): Promise<TypeEvenement[]> {
  return fromTable(supabase, "type_evenement", mock.MOCK_TYPE_EVENEMENTS, { column: "code", ascending: true });
}

export async function fetchMicroZones(supabase: SupabaseClient | null): Promise<MicroZone[]> {
  const rows = await fromTable<MicroZone>(supabase, "micro_zones", mock.MOCK_MICRO_ZONES, { column: "nom" });
  return rows;
}

export async function fetchDonneesMeteo(
  supabase: SupabaseClient | null,
  exploitationId?: string
): Promise<DonneesMeteo[]> {
  if (!supabase || !SUPABASE_CONFIGURED) {
    return exploitationId
      ? mock.MOCK_METEO.filter((m) => m.exploitation_id === exploitationId)
      : mock.MOCK_METEO;
  }
  let q = supabase.from("donnees_meteo").select("*").order("date_mesure", { ascending: false }).limit(60);
  if (exploitationId) q = q.eq("exploitation_id", exploitationId);
  const { data, error } = await q;
  if (error || !data?.length) return mock.MOCK_METEO;
  return data as DonneesMeteo[];
}

export async function fetchDonneesSatellite(supabase: SupabaseClient | null): Promise<DonneesSatellite[]> {
  if (!supabase || !SUPABASE_CONFIGURED) return mock.MOCK_SATELLITE;
  const { data, error } = await supabase
    .from("donnees_satellite")
    .select("*, parcelles(name)")
    .order("date_acquisition", { ascending: false })
    .limit(100);
  if (error || !data?.length) return mock.MOCK_SATELLITE;
  return (data as Record<string, unknown>[]).map((r) => ({
    ...(r as DonneesSatellite),
    parcelle_name: (r.parcelles as { name?: string } | null)?.name,
  }));
}

export async function fetchMaladies(supabase: SupabaseClient | null): Promise<Maladie[]> {
  return fromTable(supabase, "maladies", mock.MOCK_MALADIES, { column: "nom", ascending: true });
}

export async function fetchEvenementsMaladie(supabase: SupabaseClient | null): Promise<EvenementMaladie[]> {
  if (!supabase || !SUPABASE_CONFIGURED) return mock.MOCK_EVENEMENTS_MALADIE;
  const { data, error } = await supabase
    .from("evenements_maladie")
    .select("*, maladies(nom), parcelles(name)")
    .order("date_observation", { ascending: false })
    .limit(100);
  if (error || !data?.length) return mock.MOCK_EVENEMENTS_MALADIE;
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    maladie_id: r.maladie_id as string,
    parcelle_id: r.parcelle_id as string | null,
    severite: r.severite as string,
    date_observation: r.date_observation as string,
    notes: r.notes as string | null,
    source: r.source as string,
    maladie_nom: (r.maladies as { nom?: string })?.nom,
    parcelle_name: (r.parcelles as { name?: string })?.name,
  }));
}

export async function fetchProtocoles(supabase: SupabaseClient | null): Promise<Protocole[]> {
  if (!supabase || !SUPABASE_CONFIGURED) return mock.MOCK_PROTOCOLES;
  const { data, error } = await supabase.from("protocoles").select("*").order("nom");
  if (error || !data?.length) return mock.MOCK_PROTOCOLES;
  const protocoles = data as Protocole[];
  const { data: etapes } = await supabase.from("etapes_protocole").select("*").order("ordre");
  const byProt = new Map<string, NonNullable<Protocole["etapes"]>>();
  for (const e of (etapes || []) as NonNullable<Protocole["etapes"]>[number][]) {
    const list = byProt.get(e.protocole_id) || [];
    list.push(e);
    byProt.set(e.protocole_id, list);
  }
  return protocoles.map((p) => ({ ...p, etapes: byProt.get(p.id) || [] }));
}

export async function fetchRecoltes(supabase: SupabaseClient | null): Promise<Recolte[]> {
  if (!supabase || !SUPABASE_CONFIGURED) return mock.MOCK_RECOLTES;
  const { data, error } = await supabase
    .from("recoltes")
    .select("*, parcelles(name), campagnes(nom)")
    .order("date_recolte", { ascending: false });
  if (error || !data?.length) return mock.MOCK_RECOLTES;
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    parcelle_id: r.parcelle_id as string,
    campagne_id: r.campagne_id as string | null,
    date_recolte: r.date_recolte as string,
    quantite: r.quantite as number,
    unite: r.unite as string,
    qualite: r.qualite as string | null,
    parcelle_name: (r.parcelles as { name?: string })?.name,
    campagne_nom: (r.campagnes as { nom?: string })?.nom,
  }));
}

export async function fetchRevenus(supabase: SupabaseClient | null): Promise<Revenu[]> {
  return fromTable(supabase, "revenus", mock.MOCK_REVENUS, { column: "created_at" });
}

export async function fetchResultats(supabase: SupabaseClient | null): Promise<Resultat[]> {
  if (!supabase || !SUPABASE_CONFIGURED) return mock.MOCK_RESULTATS;
  const { data, error } = await supabase
    .from("resultats")
    .select("*, parcelles(name)")
    .order("date_evaluation", { ascending: false });
  if (error || !data?.length) return mock.MOCK_RESULTATS;
  return (data as Record<string, unknown>[]).map((r) => ({
    ...(r as Resultat),
    parcelle_name: (r.parcelles as { name?: string })?.name,
  }));
}

export async function fetchMesuresAgregees(supabase: SupabaseClient | null): Promise<MesureAgregee[]> {
  return fromTable(supabase, "mesures_agregees", mock.MOCK_MESURES_AGREGEES, { column: "bucket_start" });
}

export async function fetchIaDecisions(supabase: SupabaseClient | null): Promise<IaDecision[]> {
  return fromTable(supabase, "ia_decisions", mock.MOCK_DECISIONS, { column: "created_at" });
}

export async function fetchApprentissages(supabase: SupabaseClient | null): Promise<Apprentissage[]> {
  return fromTable(supabase, "apprentissages", mock.MOCK_APPRENTISSAGES, { column: "horodatage" });
}

export async function fetchPnlCampagnes(supabase: SupabaseClient | null): Promise<PnlCampagne[]> {
  if (!supabase || !SUPABASE_CONFIGURED) return mock.MOCK_PNL;

  const { data: campagnes } = await supabase.from("campagnes").select("id, nom");
  if (!campagnes?.length) return mock.MOCK_PNL;

  const pnl: PnlCampagne[] = [];
  for (const c of campagnes as { id: string; nom: string }[]) {
    const { data: rev } = await supabase.from("revenus").select("montant_dzd").eq("campagne_id", c.id);
    const { data: dep } = await supabase.from("depenses").select("montant_dzd").eq("campagne_id", c.id);
    const { count: recCount } = await supabase
      .from("recoltes")
      .select("*", { count: "exact", head: true })
      .eq("campagne_id", c.id);
    const { count: trtCount } = await supabase
      .from("treatments")
      .select("*", { count: "exact", head: true });

    const revenus_dzd = (rev || []).reduce((s, r) => s + Number((r as { montant_dzd: number }).montant_dzd), 0);
    const depenses_dzd = (dep || []).reduce((s, d) => s + Number((d as { montant_dzd: number }).montant_dzd), 0);
    pnl.push({
      campagne_id: c.id,
      campagne_nom: c.nom,
      revenus_dzd,
      depenses_dzd,
      marge_dzd: revenus_dzd - depenses_dzd,
      nb_recoltes: recCount ?? 0,
      nb_traitements: trtCount ?? 0,
    });
  }
  return pnl.length ? pnl : mock.MOCK_PNL;
}

export async function fetchTenantUsers(supabase: SupabaseClient | null): Promise<TenantUser[]> {
  if (!supabase || !SUPABASE_CONFIGURED) return mock.MOCK_TENANT_USERS;
  const { data, error } = await supabase.from("user_profiles").select("id, role, exploitation_id, full_name");
  if (error || !data?.length) return mock.MOCK_TENANT_USERS;
  return (data as Record<string, unknown>[]).map((u) => ({
    id: u.id as string,
    email: "",
    role: u.role as string,
    exploitation_id: u.exploitation_id as string | null,
    full_name: u.full_name as string | null,
  }));
}
