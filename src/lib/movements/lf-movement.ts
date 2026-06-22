import { z } from "zod";

export const lfMovementFlowSchema = z.enum([
  "stock_initial",
  "transfert",
  "entree",
  "retour",
  "sortie",
]);

export const lfMovementInsertSchema = z.object({
  product_id: z.string().uuid("ID produit invalide"),
  date: z.string().min(1, "Date requise"),
  flow: lfMovementFlowSchema,
  quantity: z.number().positive("Quantité requise"),
  unit: z.string().optional(),
  culture: z.enum(["a_pepins", "a_noyau", "vigne"]).optional().nullable(),
  site_id: z.string().uuid().optional().nullable(),
  site_name: z.string().optional(),
  details_site: z.string().optional(),
  supplier_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional(),
  source_tag: z.string().optional(),
  dose: z.string().optional(),
  dar_days: z.number().int().optional().nullable(),
});

const LF_CULTURES = new Set(["a_pepins", "a_noyau", "vigne"]);
const LF_FLOWS = new Set<string>(lfMovementFlowSchema.options);

const UI_UNIT_TO_LF: Record<string, string> = {
  l: "l", kg: "kg", ml: "l", g: "kg", qx: "qx", unite: "unite",
};

export function lfUnit(u?: unknown): string {
  return UI_UNIT_TO_LF[String(u ?? "").trim().toLowerCase()] || "l";
}

export function mapMovementInputToLfRow(input: Record<string, unknown>): Record<string, unknown> {
  const flowRaw = String(input.flow ?? input.movement_type ?? "entree");
  const flow = LF_FLOWS.has(flowRaw) ? flowRaw : "entree";
  const quantity = Math.abs(Number(input.quantity));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantité invalide");
  }

  const row: Record<string, unknown> = {
    product_id: input.product_id,
    date: input.date,
    flow,
    quantity,
  };

  if (input.unit) row.unit = lfUnit(input.unit);

  const culture = input.culture ? String(input.culture) : "";
  if (LF_CULTURES.has(culture)) row.culture = culture;

  if (input.site_id) row.site_id = input.site_id;
  if (input.site_name) row.site_name = input.site_name;
  if (input.details_site) row.details_site = input.details_site;
  if (input.supplier_id) row.supplier_id = input.supplier_id;
  if (input.dose) row.dose = input.dose;
  if (input.dar_days != null) row.dar_days = input.dar_days;
  if (input.source_tag) row.source_tag = input.source_tag;

  const notes = input.notes ?? input.observations;
  if (notes) row.notes = String(notes);

  return row;
}

export function mapMovementUpdatesToLfRow(updates: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if ("date" in updates) row.date = updates.date;
  if ("flow" in updates || "movement_type" in updates) {
    const flowRaw = String(updates.flow ?? updates.movement_type);
    if (LF_FLOWS.has(flowRaw)) row.flow = flowRaw;
  }
  if ("quantity" in updates) {
    const quantity = Math.abs(Number(updates.quantity));
    if (Number.isFinite(quantity)) row.quantity = quantity;
  }
  if ("culture" in updates) {
    const culture = updates.culture ? String(updates.culture) : "";
    row.culture = LF_CULTURES.has(culture) ? culture : null;
  }
  if ("site_id" in updates) row.site_id = updates.site_id;
  if ("site_name" in updates) row.site_name = updates.site_name;
  if ("details_site" in updates) row.details_site = updates.details_site;
  if ("supplier_id" in updates) row.supplier_id = updates.supplier_id;
  if ("unit" in updates) row.unit = lfUnit(updates.unit);
  if ("notes" in updates) row.notes = updates.notes;
  if ("observations" in updates) row.notes = updates.observations;
  if ("source_tag" in updates) row.source_tag = updates.source_tag;
  if ("dose" in updates) row.dose = updates.dose;
  if ("dar_days" in updates) row.dar_days = updates.dar_days;

  return row;
}
