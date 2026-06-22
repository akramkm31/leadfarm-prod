import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/v1/public/lot/:lotId — PUBLIC, no auth (QR-code traceability).
 * Resolves a harvest lot (recoltes.identifiant_lot or recoltes.id) and returns
 * ONLY public-safe traceability data: lot, parcelle, campagne, treatments.
 * No prices, no nominative personal data. Uses the service client to bypass RLS
 * server-side; on any failure returns { source: "demo" } so the page falls back
 * to its baked demo content.
 */
export const dynamic = "force-dynamic";

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ lotId: string }> }) {
  const { lotId: raw } = await ctx.params;
  const lotId = decodeURIComponent(raw || "").trim();
  if (!lotId) return ok({ source: "demo", reason: "empty-lot" });

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return ok({ source: "demo", reason: "no-service-credentials" });
  }

  try {
    // 1 — Resolve the lot (by business identifier, fallback to PK)
    const byIdent = await supabase
      .from("recoltes")
      .select("*, parcelles(*), campagnes(*)")
      .eq("identifiant_lot", lotId)
      .maybeSingle();

    let recolte = byIdent.data as Record<string, unknown> | null;

    if (!recolte) {
      const byId = await supabase
        .from("recoltes")
        .select("*, parcelles(*), campagnes(*)")
        .eq("id", lotId)
        .maybeSingle();
      recolte = byId.data as Record<string, unknown> | null;
    }

    if (!recolte) return ok({ source: "demo", reason: "lot-not-found" });

    const parcelle = (recolte.parcelles as Record<string, unknown> | null) ?? null;
    const campagne = (recolte.campagnes as Record<string, unknown> | null) ?? null;
    const parcelleId = (recolte.parcelle_id as string) ?? (parcelle?.id as string) ?? null;

    // 2 — Treatments for this parcelle, bounded to campagne window when available
    let txQuery = supabase
      .from("treatments")
      .select(
        `id, type, cible, status, planned_date, executed_date, area_treated_hectares,
         volume_bouillie, materiel, operator_name, dar_days,
         treatment_products ( quantity_used, unit, dose_per_hectare, products ( trade_name, active_substance, unit ) ),
         treatment_detail_products ( * )`
      )
      .eq("parcelle_id", parcelleId)
      .order("planned_date", { ascending: false });

    const dDebut = campagne?.date_debut as string | null;
    const dFin = campagne?.date_fin as string | null;
    if (dDebut) txQuery = txQuery.gte("planned_date", dDebut);
    if (dFin) txQuery = txQuery.lte("planned_date", dFin);

    const { data: treatmentsRaw } = await txQuery;
    const treatments = (treatmentsRaw as Record<string, unknown>[] | null) ?? [];

    // 3 — Anonymize operators (public page → no nominative data)
    const operatorRefs = new Map<string, string>();
    let opIdx = 0;
    const treatmentsPublic = treatments.map((t) => {
      const opName = (t.operator_name as string) || "";
      let opRef = "";
      if (opName) {
        if (!operatorRefs.has(opName)) operatorRefs.set(opName, `OP-${String(++opIdx).padStart(3, "0")}`);
        opRef = operatorRefs.get(opName)!;
      }
      const tp = (t.treatment_products as Record<string, unknown>[] | null) ?? [];
      const detail = (t.treatment_detail_products as Record<string, unknown>[] | null) ?? [];
      const produits = detail.length
        ? detail.map((d) => ({
            nom: (d.nom_commercial as string) || (d.product_name as string) || "Produit",
            matiere_active: (d.matiere_active as string) || null,
            dose: (d.dose_hl as number) ?? (d.dose as number) ?? null,
            amm: (d.amm as string) || (d.numero_amm as string) || null,
            lot: (d.numero_lot as string) || null,
          }))
        : tp.map((p) => {
            const prod = (p.products as Record<string, unknown> | null) ?? null;
            return {
              nom: (prod?.trade_name as string) || "Produit",
              matiere_active: (prod?.active_substance as string) || null,
              dose: (p.dose_per_hectare as number) ?? (p.quantity_used as number) ?? null,
              amm: null,
              lot: null,
            };
          });

      return {
        id: t.id,
        type: t.type ?? null,
        cible: t.cible ?? null,
        status: t.status ?? null,
        date: (t.executed_date as string) || (t.planned_date as string) || null,
        area_ha: t.area_treated_hectares ?? null,
        volume_bouillie: t.volume_bouillie ?? null,
        materiel: t.materiel ?? null,
        operator_ref: opRef || null,
        dar_days: t.dar_days ?? null,
        produits,
      };
    });

    // 4 — Public-safe payload
    return ok({
      source: "live",
      lot: {
        id: (recolte.identifiant_lot as string) || (recolte.id as string),
        date_recolte: recolte.date_recolte ?? null,
        quantite: recolte.quantite ?? null,
        unite: recolte.unite ?? null,
        qualite: recolte.qualite ?? null,
        notes: recolte.notes ?? null,
      },
      parcelle: parcelle
        ? {
            name: parcelle.name ?? null,
            code: parcelle.code ?? null,
            area_ha: parcelle.area_hectares ?? parcelle.surface_ha ?? null,
            culture: parcelle.crop_type ?? parcelle.culture ?? null,
            variete: parcelle.variete ?? null,
            porte_greffe: parcelle.porte_greffe ?? null,
            altitude: parcelle.altitude ?? null,
            lat: parcelle.lat ?? parcelle.latitude ?? null,
            lng: parcelle.lng ?? parcelle.longitude ?? null,
            date_implantation: parcelle.date_implantation ?? null,
            sol: parcelle.soil_type ?? null,
            irrigation: parcelle.irrigation ?? null,
          }
        : null,
      campagne: campagne
        ? {
            nom: campagne.nom ?? null,
            date_debut: campagne.date_debut ?? null,
            date_fin: campagne.date_fin ?? null,
            statut: campagne.statut ?? null,
            culture: campagne.culture ?? null,
            marche_destination: campagne.marche_destination ?? null,
            ggn: campagne.ggn ?? null,
            rendement_cible_kg_ha: campagne.rendement_cible_kg_ha ?? null,
            qualite_cible_cat1_pct: campagne.qualite_cible_cat1_pct ?? null,
            ift_cible: campagne.ift_cible ?? null,
          }
        : null,
      treatments: treatmentsPublic,
      counts: {
        treatments: treatmentsPublic.length,
        operators: operatorRefs.size,
      },
    });
  } catch (e) {
    return ok({ source: "demo", reason: "error", detail: String(e instanceof Error ? e.message : e) });
  }
}
