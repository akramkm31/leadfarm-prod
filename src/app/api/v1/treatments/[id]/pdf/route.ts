/**
 * GET /api/v1/treatments/[id]/pdf
 * 
 * Génère le PDF FOR.PR6.003 pour un traitement spécifique.
 * - Récupère les données du traitement par son ID
 * - Injecte les données dans le template jsPDF
 * - Retourne le blob en téléchargement
 * - Logge la génération dans audit_log
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuthRbac, requireFeature } from "@/lib/api-helpers";
import { CANONICAL_PARCELLE_TABLE } from "@/lib/parcelles/constants";
import { genererOrdreTraitementPDF } from "@/lib/pdf/ordreTraitement";
import { upsertTraceVerification, verifyPublicUrl } from "@/lib/trace/verification";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuthRbac(req);
  if (auth.error) return auth.error;
  const denied = requireFeature(auth, "registre");
  if (denied) return denied;
  const supabase = auth.supabase;

  const { id } = await params;

  if (!id || id.length < 8) {
    return NextResponse.json(
      { error: "ID de traitement invalide" },
      { status: 400 }
    );
  }

  try {
    // 1. Charger le traitement avec ses relations
    const { data: treatment, error: tError } = await supabase
      .from("treatments")
      .select(`
        *,
        treatment_products(*, products(trade_name, unit))
      `)
      .eq("id", id)
      .single();

    if (tError || !treatment) {
      return NextResponse.json(
        { error: "Traitement introuvable", details: tError?.message },
        { status: 404 }
      );
    }

    // 2. FOR.PR6.003 — colonnes typées (014) avec repli legacy `notes`
    let legacy: Record<string, unknown> = {};
    if (treatment.notes && typeof treatment.notes === "string" && treatment.notes.includes("---FOR.PR6.003---")) {
      try {
        legacy = JSON.parse(
          treatment.notes.split("---FOR.PR6.003---")[1]?.trim() || "{}"
        ) as Record<string, unknown>;
      } catch {
        legacy = {};
      }
    }
    const pick = (col: string, key: string, fallback: unknown = "") =>
      (treatment as Record<string, unknown>)[col] ?? legacy[key] ?? fallback;

    // 3. Produits détaillés
    const produits = ((legacy as any).produitsDetail || []).map((p: any) => ({
      nom_commercial: p.nom_commercial || "",
      matiere_active: p.matiere_active || "",
      dose_hl: p.dose_hl || "",
      quantite_sortir: p.quantite_sortir || "",
    }));

    // Fallback sur treatment_products si pas de detail
    if (produits.length === 0) {
      (treatment.treatment_products || []).forEach((tp: any) => {
        produits.push({
          nom_commercial: tp.products?.trade_name || "",
          matiere_active: tp.products?.active_substance || "",
          dose_hl: tp.dose_per_hectare ? `${tp.dose_per_hectare}` : "",
          quantite_sortir: tp.quantity_used ? `${tp.quantity_used} ${tp.unit || "L"}` : "",
        });
      });
    }

    // 4. Parcelle canonique (ADR-15)
    let parcelleNom = treatment.site_name || "";
    let superficieHa = treatment.area_treated_hectares || 0;

    const parcelleLookupId = treatment.parcelle_id as string | null;
    if (parcelleLookupId) {
      const { data: region } = await supabase
        .from(CANONICAL_PARCELLE_TABLE)
        .select("name, area_hectares")
        .eq("id", parcelleLookupId)
        .maybeSingle();
      if (region) {
        parcelleNom = region.name || parcelleNom;
        superficieHa = region.area_hectares || superficieHa;
      }
    } else if (treatment.site_name) {
      const { data: region } = await supabase
        .from(CANONICAL_PARCELLE_TABLE)
        .select("name, area_hectares")
        .ilike("name", treatment.site_name)
        .limit(1)
        .maybeSingle();
      if (region) {
        parcelleNom = region.name || parcelleNom;
        superficieHa = region.area_hectares || superficieHa;
      }
    }

    const pdfBlob = await genererOrdreTraitementPDF({
      site: "Domaine Khelifa",
      n_traitement: treatment.id?.slice(0, 8).toUpperCase() || "N/A",
      date_prevue: treatment.planned_date || "",
      parcelle_nom: parcelleNom,
      superficie_ha: superficieHa || undefined,
      // Section 1 - depuis JSONB
      culture: String(pick("culture", "culture")),
      variete: String(pick("variete", "variete")),
      cible: String(pick("cible", "cible")),
      mode_application: String(pick("mode_application", "mode_application")),
      materiel_utilise: String(pick("materiel", "materiel")),
      vitesse_avancement_kmh: Number(pick("vitesse_kmh", "vitesse_kmh", 0)) || undefined,
      pression_service_bar: Number(pick("pression_bar", "pression_bar", 0)) || undefined,
      diametre_pastilles_mm: Number(pick("diametre_pastilles_mm", "diametre_pastilles_mm", 0)) || undefined,
      // Section 2
      produits,
      // Section 3
      operateur_nom: treatment.operator_name || "",
      date_reelle: (pick("date_reelle", "date_reelle", null) as string) || treatment.executed_date || undefined,
      heure_debut: (pick("heure_debut", "heure_debut", null) as string) || undefined,
      heure_fin: (pick("heure_fin", "heure_fin", null) as string) || undefined,
      quantite_utilisee: (pick("quantite_utilisee", "quantite_utilisee", null) as string) || undefined,
      bouillon_citerne_l: (pick("bouillon_citerne_l", "bouillon_citerne_l", null) as number) || undefined,
      nb_citernes: (pick("nb_citernes", "nb_citernes", null) as number) || undefined,
      date_reentree: (pick("date_reentree", "date_reentree", null) as string) || undefined,
      dar_jours: Number(pick("dar_jours", "dar_jours", 0)) || undefined,
      efficacite: String(pick("efficacite", "efficacite")),
      visa_rt: String(pick("visa_rt", "visa_rt")),
      signe: ["completed", "evaluated", "approved", "terminé", "planifie"].includes(treatment.status),
    });

    // 5. Certificat traçabilité public
    const traceHash = await upsertTraceVerification({
      treatmentId: id,
      siteName: parcelleNom,
      status: treatment.status,
      plannedDate: treatment.planned_date,
      executedDate: treatment.executed_date ?? (pick("date_reelle", "date_reelle", null) as string),
      culture: String(pick("culture", "culture")),
      cible: String(pick("cible", "cible")),
      products: produits.map((p: { nom_commercial: string; quantite_sortir: string }) => ({
        name: p.nom_commercial,
        quantity: p.quantite_sortir ? parseFloat(p.quantite_sortir) : null,
        unit: "L",
      })),
      exploitationId: treatment.exploitation_id,
    });

    // 6. Audit log
    await supabase.from("audit_log").insert({
      table_name: "treatments",
      record_id: id,
      action: "PDF_GENERATED",
      new_data: {
        generated_at: new Date().toISOString(),
        format: "FOR.PR6.003",
        trace_hash: traceHash,
        verify_url: verifyPublicUrl(traceHash, req.nextUrl.origin),
      },
    }).then(() => {});

    // 7. Retourner le PDF
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="FOR.PR6.003_${id}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("[PDF Generation Error]", err);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF", details: err.message },
      { status: 500 }
    );
  }
}
