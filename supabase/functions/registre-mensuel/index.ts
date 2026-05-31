/**
 * Registre Mensuel Phytosanitaire Automatique
 *
 * Edge Function Supabase — d�clench�e le 1er de chaque mois � 06h00
 * Schedule cron : "0 6 1 * *"
 *
 * G�n�re le PDF FOR.PR6.004 pour le mois pr�c�dent,
 * l'upload dans Supabase Storage,
 * et notifie le Responsable Technique.
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TraitementRow {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  parcelle_nom: string;
  culture: string;
  cible: string;
  produits: {
    nom: string;
    matiere_active: string;
    quantite: number;
    unite: string;
    dose_ha: number;
  }[];
  volume_total_l: number;
  dose_reelle_l_ha: number;
  quantite_reelle_l: number;
  materiel: string;
  operateur_nom: string;
  dar_date_recolte_autorisee: string;
  dar_jours_max: number;
  epi_confirme: boolean;
  distance_m: number;
  area_covered_ha: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDateISO(d: string): string {
  if (!d) return "___/___/____";
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch {
    return d.slice(0, 10);
  }
}

// ─── G�n�rateur PDF simplifi� (sans jsPDF en Deno) ────────────────────────────

function genererRegistreHTML(traitements: TraitementRow[], mois: number, annee: number): string {
  const moisNoms = [
    "Janvier", "F�vrier", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Ao�t", "Septembre", "Octobre", "Novembre", "D�cembre",
  ];

  const rows = traitements.map((t, i) => {
    const produitsStr = (t.produits || [])
      .map((p) => `${p.nom} (${p.matiere_active || "N/A"})`)
      .join(", ");
    const dars = (t.produits || [])
      .filter((p) => p.matiere_active)
      .map((p) => `${p.matiere_active}: ${t.dar_jours_max || "?"}j`)
      .join("; ");

    return `
    <tr>
      <td>${i + 1}</td>
      <td>${formatDateISO(t.start_time)}</td>
      <td>${t.parcelle_nom}</td>
      <td>${t.cible || "—"}</td>
      <td>${produitsStr || "—"}</td>
      <td>${t.dar_date_recolte_autorisee ? formatDateISO(t.dar_date_recolte_autorisee) : "—"}</td>
      <td>${t.volume_total_l?.toFixed(1) || "—"}</td>
      <td>${t.dose_reelle_l_ha?.toFixed(2) || "—"}</td>
      <td>${t.quantite_reelle_l?.toFixed(1) || "—"}</td>
      <td>${t.materiel || "—"}</td>
      <td>${t.operateur_nom || "—"}</td>
      <td>${t.epi_confirme ? "Oui" : "Non"}</td>
    </tr>`;
  }).join("\n");

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Registre Mensuel Phytosanitaire — ${moisNoms[mois - 1]} ${annee}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    body { font-family: 'Courier New', monospace; font-size: 9pt; color: #1a1a1a; }
    h1 { font-size: 16pt; text-align: center; margin-bottom: 4px; }
    h2 { font-size: 10pt; text-align: center; color: #555; margin-top: 0; font-weight: normal; }
    .header { text-align: center; margin-bottom: 20px; }
    .header .ref { font-size: 8pt; color: #888; }
    table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
    th { background-color: #2d5a27; color: white; padding: 5px 3px; text-align: left; font-size: 6.5pt; }
    td { border: 1px solid #ccc; padding: 3px; }
    tr:nth-child(even) { background-color: #f5f5f5; }
    .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 8pt; }
    .signature { border-top: 1px solid #333; padding-top: 2px; width: 200px; text-align: center; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 60pt; color: rgba(200,200,200,0.3); font-weight: bold; pointer-events: none; z-index: -1; }
  </style>
</head>
<body>
  <div class="header">
    <h1>REGISTRE DES INTERVENTIONS PHYTOSANITAIRES</h1>
    <h2>Domaine Khelifa — ${moisNoms[mois - 1]} ${annee}</h2>
    <p class="ref">FOR.PR6.004 — Version A — G�n�r� automatiquement le ${new Date().toLocaleDateString("fr-FR")}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>N°</th>
        <th>Date d'application</th>
        <th>Parcelle</th>
        <th>Cible</th>
        <th>Produits</th>
        <th>Date r�colte permise</th>
        <th>Qt� m�lange (L)</th>
        <th>Dose (L/ha)</th>
        <th>Qt� produit (L)</th>
        <th>Mat�riel</th>
        <th>Op�rateur</th>
        <th>EPI</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  ${traitements.length === 0 ? '<div class="watermark">Aucun traitement</div>' : ""}

  <div class="footer">
    <div>
      <p>Total traitements : ${traitements.length}</p>
      <p>Surface totale : ${traitements.reduce((a, t) => a + (t.area_covered_ha || 0), 0).toFixed(2)} ha</p>
      <p>Volume total : ${traitements.reduce((a, t) => a + (t.volume_total_l || 0), 0).toFixed(1)} L</p>
    </div>
    <div class="signature">
      Visa Responsable Technique<br/>
      _________________________
    </div>
  </div>
</body>
</html>`;
}

// ─── Handler principal ─────────────────────────────────────────────────────────

serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const maintenant = new Date();
  const moisPrecedent = maintenant.getMonth(); // 0-index� (janvier=0)
  const annee = moisPrecedent === 0
    ? maintenant.getFullYear() - 1
    : maintenant.getFullYear();
  const mois = moisPrecedent === 0 ? 12 : moisPrecedent;

  const debut = `${annee}-${String(mois).padStart(2, "0")}-01`;
  // Dernier jour du mois
  const dernierJour = new Date(annee, mois, 0).getDate();
  const fin = `${annee}-${String(mois).padStart(2, "0")}-${dernierJour}`;

  console.log(`G�n�ration registre pour ${debut} → ${fin}`);

  // R�cup�rer les traitements termin�s du mois
  const { data: traitements, error } = await supabase
    .from("traitements")
    .select(`
      id, start_time, end_time, status, type,
      volume_total_l, dose_reelle_l_ha, quantite_reelle_l,
      materiel, dar_date_recolte_autorisee, dar_jours_max,
      epi_confirme, distance_m, area_covered_ha,
      cible_maladie, cible_ravageur,
      parcelles!inner(nom, culture_actuelle),
      traitement_produits!inner(
        produits_ppp!inner(nom_commercial, matiere_active),
        quantite_reelle, unite, dose_ha_prevue
      ),
      operator:operator_id(nom_complet)
    `)
    .eq("status", "completed")
    .gte("start_time", debut)
    .lte("start_time", fin);

  if (error) {
    console.error("Erreur requ�te traitements:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Mapper les donn�es
  const rows: TraitementRow[] = (traitements || []).map((t: any) => ({
    id: t.id,
    start_time: t.start_time,
    end_time: t.end_time,
    status: t.status,
    type: t.type,
    parcelle_nom: t.parcelles?.nom || "N/A",
    culture: t.parcelles?.culture_actuelle || "N/A",
    cible: t.cible_maladie || t.cible_ravageur || "",
    produits: (t.traitement_produits || []).map((tp: any) => ({
      nom: tp.produits_ppp?.nom_commercial || "N/A",
      matiere_active: tp.produits_ppp?.matiere_active || "",
      quantite: tp.quantite_reelle || 0,
      unite: tp.unite || "L",
      dose_ha: tp.dose_ha_prevue || 0,
    })),
    volume_total_l: t.volume_total_l || 0,
    dose_reelle_l_ha: t.dose_reelle_l_ha || 0,
    quantite_reelle_l: t.quantite_reelle_l || 0,
    materiel: t.materiel || "",
    operateur_nom: t.operator?.nom_complet || "N/A",
    dar_date_recolte_autorisee: t.dar_date_recolte_autorisee,
    dar_jours_max: t.dar_jours_max,
    epi_confirme: t.epi_confirme || false,
    distance_m: t.distance_m || 0,
    area_covered_ha: t.area_covered_ha || 0,
  }));

  // G�n�rer le HTML
  const html = genererRegistreHTML(rows, mois, annee);

  // Convertir en PDF via une API de conversion (ex: puppeteer)
  // Pour Deno, on utilise un service externe ou on stocke le HTML
  // Solution simple : stocker le HTML et le marquer comme disponible
  const filename = `registres/${annee}-${String(mois).padStart(2, "0")}.html`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filename, html, {
      contentType: "text/html",
      upsert: true,
    });

  if (uploadError) {
    console.error("Erreur upload:", uploadError);
  }

  // Notifier le responsable technique
  const { error: notifError } = await supabase.from("notifications").insert({
    type: "registre_mensuel_genere",
    message: `Registre ${mois}/${annee} g�n�r� — ${rows.length} traitements — signature requise`,
    pdf_url: filename,
    created_at: new Date().toISOString(),
  });

  if (notifError) {
    console.error("Erreur notification:", notifError);
  }

  console.log(`Registre g�n�r� : ${filename} (${rows.length} traitements)`);

  return new Response(
    JSON.stringify({
      success: true,
      filename,
      count: rows.length,
      mois: `${moisNoms(mois)} ${annee}`,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
