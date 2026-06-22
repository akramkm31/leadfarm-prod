import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toIsoDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return s;
}

export const produitDetailSchema = z.object({
  productId: z.string().optional(),
  nom_commercial: z.string().optional(),
  matiere_active: z.string().optional(),
  dose_hl: z.string().optional(),
  quantite_sortir: z.string().optional(),
  dar_jours: z.number().int().optional(),
  product_auth_number: z.string().optional(),
});

export const planTreatmentSchema = z.object({
  parcelleName: z.string().min(1, "Parcelle requise"),
  parcelleId: z.string().optional(),
  type: z.string().min(1, "Type requis"),
  plannedDate: z.string().min(1, "Date prévue requise"),
  operatorName: z.string().optional(),
  areaTreatedHectares: z.number().nonnegative().optional(),
  volumeBouillie: z.number().nonnegative().optional(),
  volumeBouillieUnit: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]).optional(),
  products: z
    .array(
      z.object({
        productId: z.string(),
        dosePerHectare: z.number().optional(),
        quantityUsed: z.number().optional(),
        unit: z.string().optional(),
      })
    )
    .optional(),
  culture: z.string().optional(),
  variete: z.string().optional(),
  cible: z.string().optional(),
  modeApplication: z.string().optional(),
  materiel: z.string().optional(),
  vitesseKmh: z.number().optional(),
  pressionBar: z.number().optional(),
  diametrePastillesMm: z.number().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  windSpeed: z.number().optional(),
  produitsDetail: z.array(produitDetailSchema).optional(),
  dateReelle: z.string().optional(),
  heureDebut: z.string().optional(),
  heureFin: z.string().optional(),
  qteProduitUtilise: z.string().optional(),
  bouillonParCiterne: z.number().optional(),
  nbCiternes: z.number().optional(),
  dateReentree: z.string().optional(),
  darJours: z.number().int().optional(),
  efficacite: z.string().optional(),
  visaRT: z.string().optional(),
  eppoCropCode: z.string().optional(),
  bbchStage: z.string().optional(),
});

export type PlanTreatmentInput = z.infer<typeof planTreatmentSchema>;

export async function resolveTreatmentExploitationId(
  supabase: SupabaseClient,
  parcelleId: string | null,
  accessExploitationId: string | null
): Promise<string | null> {
  if (accessExploitationId) return accessExploitationId;
  if (!parcelleId) return null;

  const { data: parcelle } = await supabase
    .from("parcelles")
    .select("exploitation_id")
    .eq("id", parcelleId)
    .maybeSingle();
  if (parcelle?.exploitation_id) return parcelle.exploitation_id;
  return null;
}

export function buildTreatmentInsertRow(
  input: PlanTreatmentInput,
  exploitationId: string | null
): Record<string, unknown> {
  const parcelleId =
    input.parcelleId && UUID_RE.test(input.parcelleId) ? input.parcelleId : null;
  const plannedDate = toIsoDate(input.plannedDate);
  if (!plannedDate) throw new Error("Date prévue invalide");

  const status = (input.status || "planned") as string;

  const row: Record<string, unknown> = {
    site_name: input.parcelleName,
    parcelle_id: parcelleId,
    exploitation_id: exploitationId,
    type: input.type,
    planned_date: plannedDate,
    operator_name: input.operatorName || null,
    area_treated_hectares: input.areaTreatedHectares ?? null,
    volume_bouillie: input.volumeBouillie ?? null,
    volume_bouillie_unit: input.volumeBouillieUnit || null,
    notes: input.notes || null,
    status,
    culture: input.culture || null,
    variete: input.variete || null,
    cible: input.cible || null,
    mode_application: input.modeApplication || null,
    materiel: input.materiel || null,
    vitesse_kmh: input.vitesseKmh ?? null,
    pression_bar: input.pressionBar ?? null,
    diametre_pastilles_mm: input.diametrePastillesMm ?? null,
    temperature: input.temperature ?? null,
    humidity: input.humidity ?? null,
    wind_speed: input.windSpeed ?? null,
    date_reentree: toIsoDate(input.dateReentree),
    dar_jours: input.darJours ?? null,
    eppo_crop_code: input.eppoCropCode || null,
    bbch_stage: input.bbchStage || null,
  };

  // Exécution / visa / efficacité : uniquement hors statut « ordre planifié ».
  if (status !== "planned" && status !== "draft" && status !== "pending_approval" && status !== "approved") {
    row.date_reelle = toIsoDate(input.dateReelle);
    row.heure_debut = input.heureDebut || null;
    row.heure_fin = input.heureFin || null;
    row.quantite_utilisee = input.qteProduitUtilise || null;
    row.bouillon_citerne_l = input.bouillonParCiterne ?? null;
    row.nb_citernes = input.nbCiternes ?? null;
  }
  if (status === "completed" || status === "evaluated") {
    row.efficacite = input.efficacite || null;
    row.visa_rt = input.visaRT || null;
  }

  return row;
}

export async function resolveLegacyProductId(
  supabase: SupabaseClient,
  candidateId: string | undefined
): Promise<string | null> {
  if (!candidateId || !UUID_RE.test(candidateId)) return null;

  const { data: legacy } = await supabase
    .from("products")
    .select("id")
    .eq("id", candidateId)
    .maybeSingle();
  if (legacy?.id) return legacy.id;

  const { data: lf } = await supabase
    .from("lf_products")
    .select("name")
    .eq("id", candidateId)
    .maybeSingle();
  if (!lf?.name) return null;

  const { data: byName } = await supabase
    .from("products")
    .select("id")
    .ilike("trade_name", lf.name)
    .limit(1)
    .maybeSingle();
  return byName?.id ?? null;
}

/** Resolve any catalogue id or commercial name → lf_products.id for stock movements. */
export async function resolveLfProductId(
  supabase: SupabaseClient,
  candidateId: string | null | undefined,
  productName?: string | null
): Promise<string | null> {
  if (candidateId && UUID_RE.test(candidateId)) {
    const { data: lf } = await supabase
      .from("lf_products")
      .select("id")
      .eq("id", candidateId)
      .maybeSingle();
    if (lf?.id) return lf.id;

    const { data: legacy } = await supabase
      .from("products")
      .select("trade_name")
      .eq("id", candidateId)
      .maybeSingle();
    if (legacy?.trade_name) {
      const { data: byName } = await supabase
        .from("lf_products")
        .select("id")
        .ilike("name", legacy.trade_name)
        .limit(1)
        .maybeSingle();
      if (byName?.id) return byName.id;
    }
  }

  const name = productName?.trim();
  if (name) {
    const { data: byName } = await supabase
      .from("lf_products")
      .select("id")
      .ilike("name", name)
      .limit(1)
      .maybeSingle();
    if (byName?.id) return byName.id;
  }

  return null;
}

export async function insertTreatmentProducts(
  supabase: SupabaseClient,
  treatmentId: string,
  input: PlanTreatmentInput
) {
  if (input.produitsDetail?.length) {
    const detailRows = await Promise.all(
      input.produitsDetail
        .filter((p) => p.nom_commercial || p.productId)
        .map(async (p) => ({
          treatment_id: treatmentId,
          product_id: await resolveLegacyProductId(supabase, p.productId),
          nom_commercial: p.nom_commercial || null,
          matiere_active: p.matiere_active || null,
          dose_hl: p.dose_hl || null,
          quantite_sortir: p.quantite_sortir || null,
          dar_jours: p.dar_jours ?? 21,
          product_auth_number: p.product_auth_number || null,
        }))
    );

    if (detailRows.length > 0) {
      const { error } = await supabase.from("treatment_detail_products").insert(detailRows);
      if (error) throw new Error(error.message);
    }
    return;
  }

  if (!input.products?.length) return;

  const tpRows = await Promise.all(
    input.products
      .filter((p) => p.productId && UUID_RE.test(p.productId))
      .map(async (p) => ({
        treatment_id: treatmentId,
        product_id: (await resolveLegacyProductId(supabase, p.productId)) ?? p.productId,
        dose_per_hectare: p.dosePerHectare ?? null,
        quantity_used: p.quantityUsed ?? 0,
        unit: p.unit || "L",
      }))
  );

  if (tpRows.length === 0) return;

  const { error } = await supabase.from("treatment_products").insert(tpRows);
  if (error) {
    const fallbackRows = input.products.map((p) => ({
      treatment_id: treatmentId,
      product_id: null,
      nom_commercial: p.productId,
      matiere_active: null,
      dose_hl: p.dosePerHectare != null ? String(p.dosePerHectare) : null,
      quantite_sortir: p.quantityUsed != null ? String(p.quantityUsed) : null,
      dar_jours: 21,
    }));
    const { error: fbErr } = await supabase.from("treatment_detail_products").insert(fallbackRows);
    if (fbErr) throw new Error(fbErr.message);
  }
}

export const TREATMENT_SELECT =
  "*, treatment_products(*, products(trade_name, unit)), treatment_detail_products(*)";
