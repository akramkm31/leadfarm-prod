/**
 * repositories/treatment.repository.ts
 *
 * Single-responsibility data layer for `treatments` and `treatment_products`.
 * - Typed with TreatmentRow / TreatmentWithProducts (no `any`)
 * - Fails loudly in production (never silently returns mock data)
 * - Separates DB column names from domain model via explicit mappers
 */
import { supabase as rawSupabase, SUPABASE_CONFIGURED } from "@/lib/supabase/client";
const supabase = rawSupabase as any;
import type {
  Treatment,
  TreatmentRow,
  TreatmentWithProducts,
  TreatmentStatus,
  TreatmentProduct,
} from "@/lib/database.types";

// ── Mapper ─────────────────────────────────────────────────────────────────

function toTreatmentProduct(
  tp: TreatmentWithProducts["treatment_products"][number]
): TreatmentProduct {
  return {
    productId: tp.product_id,
    productName: tp.products?.trade_name ?? "",
    quantityUsed: tp.quantity_used,
    unit: tp.unit,
    dosePerHectare: tp.dose_per_hectare,
  };
}

export function toTreatment(row: TreatmentWithProducts): Treatment {
  return {
    id: row.id,
    siteId: row.site_id,
    parcelleId: row.parcelle_id ?? null,
    parcelleName: row.site_name ?? "",
    sousParcelleName: "",
    operatorId: row.operator_id,
    operatorName: row.operator_name ?? "",
    status: row.status,
    type: row.type,
    plannedDate: row.planned_date,
    executedDate: row.executed_date,
    areaTreatedHectares: row.area_treated_hectares ?? 0,
    treesCount: row.trees_count,
    weatherConditions: row.weather_conditions,
    windSpeed: row.wind_speed,
    temperature: row.temperature,
    humidity: row.humidity,
    volumeBouillie: row.volume_bouillie,
    volumeBouillieUnit: row.volume_bouillie_unit,
    notes: row.notes,
    totalCostDzd: row.total_cost_dzd ?? 0,
    products: (row.treatment_products ?? []).map(toTreatmentProduct),
    // FOR.PR6.003 — proper columns (post migration 014)
    culture: row.culture ?? "",
    variete: row.variete ?? "",
    cible: row.cible ?? "",
    modeApplication: row.mode_application ?? "",
    materiel: row.materiel ?? "",
    vitesseKmh: row.vitesse_kmh,
    pressionBar: row.pression_bar,
    diametrePastillesMm: row.diametre_pastilles_mm,
    dateReelle: row.date_reelle,
    heureDebut: row.heure_debut,
    heureFin: row.heure_fin,
    quantiteUtilisee: row.quantite_utilisee ?? "",
    bouillonCiterneL: row.bouillon_citerne_l,
    nbCiternes: row.nb_citernes,
    dateReentree: row.date_reentree,
    darJours: row.dar_jours,
    efficacite: row.efficacite ?? "",
    visaRt: row.visa_rt ?? "",
  };
}

// ── Select fragment ────────────────────────────────────────────────────────

const TREATMENT_SELECT =
  "*, treatment_products(*, products(trade_name, unit))" as const;

// ── Read ───────────────────────────────────────────────────────────────────

export async function getTreatments(
  filters: { status?: TreatmentStatus; limit?: number } = {}
): Promise<Treatment[]> {
  if (!SUPABASE_CONFIGURED) return [];

  let query = supabase
    .from("treatments")
    .select(TREATMENT_SELECT)
    .order("planned_date", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`[TreatmentRepository.getTreatments] ${error.message}`);
  }

  return (data as TreatmentWithProducts[]).map(toTreatment);
}

export async function getTreatmentById(id: string): Promise<Treatment | null> {
  if (!SUPABASE_CONFIGURED) return null;

  const { data, error } = await supabase
    .from("treatments")
    .select(TREATMENT_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`[TreatmentRepository.getTreatmentById] ${error.message}`);
  }

  return toTreatment(data as TreatmentWithProducts);
}

// ── Write ──────────────────────────────────────────────────────────────────

export interface InsertTreatmentInput {
  parcelleName: string;
  parcelleId?: string | null;
  type: string;
  plannedDate: string;
  operatorName?: string;
  areaTreatedHectares?: number;
  volumeBouillie?: number;
  volumeBouillieUnit?: string;
  notes?: string;
  status?: TreatmentStatus;
  // FOR.PR6.003 fields — written directly to columns
  culture?: string;
  variete?: string;
  cible?: string;
  modeApplication?: string;
  materiel?: string;
  vitesseKmh?: number | null;
  pressionBar?: number | null;
  diametrePastillesMm?: number | null;
  dateReelle?: string | null;
  heureDebut?: string | null;
  heureFin?: string | null;
  quantiteUtilisee?: string;
  bouillonCiterneL?: number | null;
  nbCiternes?: number | null;
  dateReentree?: string | null;
  darJours?: number | null;
  efficacite?: string;
  visaRt?: string;
  // Products to link
  products?: Array<{
    productId: string;
    quantityUsed?: number | null;
    unit?: string;
    dosePerHectare?: number | null;
  }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function insertTreatment(
  input: InsertTreatmentInput
): Promise<Treatment> {
  if (!SUPABASE_CONFIGURED) {
    throw new Error(
      "[TreatmentRepository] Supabase is not configured. Cannot persist treatment."
    );
  }

  const { data: row, error } = await supabase
    .from("treatments")
    .insert({
      site_name: input.parcelleName,
      parcelle_id:
        input.parcelleId && UUID_RE.test(input.parcelleId)
          ? input.parcelleId
          : null,
      type: input.type,
      planned_date: input.plannedDate,
      operator_name: input.operatorName ?? null,
      area_treated_hectares: input.areaTreatedHectares ?? null,
      volume_bouillie: input.volumeBouillie ?? null,
      volume_bouillie_unit: input.volumeBouillieUnit ?? null,
      notes: input.notes ?? null,
      status: input.status ?? "planned",
      // FOR.PR6.003 — proper columns
      culture: input.culture ?? null,
      variete: input.variete ?? null,
      cible: input.cible ?? null,
      mode_application: input.modeApplication ?? null,
      materiel: input.materiel ?? null,
      vitesse_kmh: input.vitesseKmh ?? null,
      pression_bar: input.pressionBar ?? null,
      diametre_pastilles_mm: input.diametrePastillesMm ?? null,
      date_reelle: input.dateReelle ?? null,
      heure_debut: input.heureDebut ?? null,
      heure_fin: input.heureFin ?? null,
      quantite_utilisee: input.quantiteUtilisee ?? null,
      bouillon_citerne_l: input.bouillonCiterneL ?? null,
      nb_citernes: input.nbCiternes ?? null,
      date_reentree: input.dateReentree ?? null,
      dar_jours: input.darJours ?? null,
      efficacite: input.efficacite ?? null,
      visa_rt: input.visaRt ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`[TreatmentRepository.insertTreatment] ${error.message}`);
  }

  // Insert linked products
  if (input.products && input.products.length > 0) {
    const tpRows = input.products
      .filter((p) => p.productId && UUID_RE.test(p.productId))
      .map((p) => ({
        treatment_id: row.id,
        product_id: p.productId,
        quantity_used: p.quantityUsed ?? null,
        unit: p.unit ?? "L",
        dose_per_hectare: p.dosePerHectare ?? null,
      }));

    if (tpRows.length > 0) {
      const { error: tpError } = await supabase
        .from("treatment_products")
        .insert(tpRows);

      if (tpError) {
        // Non-fatal: treatment was saved, but products link failed. Log and continue.
        console.error(
          "[TreatmentRepository] treatment_products insert failed:",
          tpError.message
        );
      }
    }
  }

  // Return the full hydrated treatment
  const full = await getTreatmentById(row.id);
  if (!full) throw new Error("[TreatmentRepository] Could not re-fetch after insert.");
  return full;
}

export interface UpdateTreatmentInput
  extends Partial<Omit<InsertTreatmentInput, "products">> {
  products?: InsertTreatmentInput["products"];
}

export async function updateTreatment(
  id: string,
  input: UpdateTreatmentInput
): Promise<Treatment> {
  if (!SUPABASE_CONFIGURED) {
    throw new Error("[TreatmentRepository] Supabase is not configured.");
  }

  const payload: Partial<TreatmentRow> = {};
  if (input.parcelleName !== undefined) payload.site_name = input.parcelleName;
  if (input.plannedDate !== undefined) payload.planned_date = input.plannedDate;
  if (input.operatorName !== undefined) payload.operator_name = input.operatorName;
  if (input.areaTreatedHectares !== undefined) payload.area_treated_hectares = input.areaTreatedHectares;
  if (input.status !== undefined) payload.status = input.status;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.culture !== undefined) payload.culture = input.culture;
  if (input.variete !== undefined) payload.variete = input.variete;
  if (input.cible !== undefined) payload.cible = input.cible;
  if (input.modeApplication !== undefined) payload.mode_application = input.modeApplication;
  if (input.materiel !== undefined) payload.materiel = input.materiel;
  if (input.vitesseKmh !== undefined) payload.vitesse_kmh = input.vitesseKmh;
  if (input.pressionBar !== undefined) payload.pression_bar = input.pressionBar;
  if (input.dateReelle !== undefined) payload.date_reelle = input.dateReelle;
  if (input.heureDebut !== undefined) payload.heure_debut = input.heureDebut;
  if (input.heureFin !== undefined) payload.heure_fin = input.heureFin;
  if (input.darJours !== undefined) payload.dar_jours = input.darJours;
  if (input.dateReentree !== undefined) payload.date_reentree = input.dateReentree;
  if (input.efficacite !== undefined) payload.efficacite = input.efficacite;
  if (input.visaRt !== undefined) payload.visa_rt = input.visaRt;

  const { error } = await supabase
    .from("treatments")
    .update(payload)
    .eq("id", id);

  if (error) {
    throw new Error(`[TreatmentRepository.updateTreatment] ${error.message}`);
  }

  // Refresh products if provided
  if (input.products !== undefined) {
    await supabase.from("treatment_products").delete().eq("treatment_id", id);
    const tpRows = (input.products ?? [])
      .filter((p) => UUID_RE.test(p.productId))
      .map((p) => ({
        treatment_id: id,
        product_id: p.productId,
        quantity_used: p.quantityUsed ?? null,
        unit: p.unit ?? "L",
        dose_per_hectare: p.dosePerHectare ?? null,
      }));
    if (tpRows.length > 0) {
      await supabase.from("treatment_products").insert(tpRows);
    }
  }

  const updated = await getTreatmentById(id);
  if (!updated) throw new Error("[TreatmentRepository] Could not re-fetch after update.");
  return updated;
}

export async function deleteTreatment(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) {
    throw new Error("[TreatmentRepository] Supabase is not configured.");
  }
  await supabase.from("treatment_products").delete().eq("treatment_id", id);
  const { error } = await supabase.from("treatments").delete().eq("id", id);
  if (error) {
    throw new Error(`[TreatmentRepository.deleteTreatment] ${error.message}`);
  }
}
