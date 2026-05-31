/**
 * GENERATEUR PDF — FOR.PR5.003 : Ordre de Fertigation
 *
 * Les fertigations utilisent des ENGRAIS (pas de PPP).
 * Pas de v�rification DAR ni LMR.
 * Stock li� = stock_engrais (table s�par�e).
 * Visa = Responsable du Site (pas Responsable Technique).
 */

import jsPDF from "jspdf";

export interface OrdreFertigationData {
  site: string;
  n_fertigation: string;
  date: string;

  parcelle_nom: string;
  superficie_ha: number;
  culture: string;
  variete: string;

  mode_application: string;
  materiel: string;
  pression_bar: number;

  produits: {
    nom_commercial: string;
    composition: string;   // NPK, micro-�l�ments...
    dose_hl: string;
    volume: number;
    quantite_par_bac: string;
    nombre_bacs: number;
    quantite_sortir: string; // calcul� auto
  }[];

  visa_responsable?: string;
  signe: boolean;
}

function formatDate(d: string): string {
  if (!d) return "__________";
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch {
    return d;
  }
}

export async function genererOrdreFertigationPDF(
  data: Partial<OrdreFertigationData>
): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const M = 15;
  const pageW = W - 2 * M;

  // ── EN-T�TE ──
  doc.setFontSize(16).setFont("helvetica", "bold");
  doc.text("ORDRE DE FERTIGATION", W / 2, 25, { align: "center" });

  doc.setFontSize(8).setFont("helvetica", "normal");
  doc.text("FOR.PR5.003  Version : A  Page : 1 sur 1", W - M, 18, { align: "right" });

  // ── LIGNE 1 : Site / N� Fertigation / Date ──
  let y = 38;
  const row1 = [
    { label: "Site :", value: data.site || "", w: 70 },
    { label: "N� Fertigation :", value: data.n_fertigation || "", w: 65 },
    { label: "Date :", value: formatDate(data.date || ""), w: pageW - 135 },
  ];

  let cx = M;
  row1.forEach((c) => {
    doc.setFontSize(8).setFont("helvetica", "bold");
    doc.text(c.label, cx, y);
    doc.setFont("helvetica", "normal");
    doc.text(c.value || "______________", cx + doc.getTextWidth(c.label) + 1, y);
    cx += c.w;
  });

  // ── LIGNE 2 : Parcelle / Culture / Vari�t� ──
  y += 10;
  const row2 = [
    { label: "Parcelle / Superficie :", value: `${data.parcelle_nom || ""} — ${data.superficie_ha ?? "____"} ha`, w: 85 },
    { label: "Culture :", value: data.culture || "", w: 50 },
    { label: "Vari�t� :", value: data.variete || "", w: pageW - 135 },
  ];
  cx = M;
  row2.forEach((c) => {
    doc.setFontSize(8).setFont("helvetica", "bold");
    doc.text(c.label, cx, y);
    doc.setFont("helvetica", "normal");
    doc.text(c.value || "______________", cx + doc.getTextWidth(c.label) + 1, y);
    cx += c.w;
  });

  // ── LIGNE 3 : Mode d'application / Mat�riel ──
  y += 10;
  doc.setFontSize(8).setFont("helvetica", "bold");
  doc.text("Mode d'application :", M, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.mode_application || "______________", M + 30, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Mat�riel utilis� :", M, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.materiel || "______________", M + 28, y);

  // ── LIGNE 4 : Pression ──
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Pression de service :", M, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.pression_bar ? `${data.pression_bar} bar` : "____ bar", M + 32, y);

  // ── TABLEAU PRODUITS ──
  y += 16;
  doc.setFontSize(9).setFont("helvetica", "bold");
  doc.text("Produits (Engrais / Fertigants)", M, y);
  y += 2;

  const colProd = [40, 35, 25, 25, 30, 20, pageW - 175];
  const headers = ["Produit", "Composition", "Dose (/hl)", "Volume", "Qt�/bac", "Nb bacs", "Qt� � sortir"];
  const produits = data.produits || [];

  // Header
  doc.setFontSize(7).setFont("helvetica", "bold");
  doc.setFillColor(220, 220, 220);
  cx = M;
  headers.forEach((h, i) => {
    doc.rect(cx, y + 1, colProd[i], 7, "F");
    doc.text(h, cx + 1, y + 6);
    cx += colProd[i];
  });

  // Rows
  doc.setDrawColor(180);
  for (let i = 0; i < Math.min(produits.length, 5); i++) {
    const p = produits[i];
    const vals = [
      p.nom_commercial,
      p.composition,
      p.dose_hl,
      `${p.volume}`,
      p.quantite_par_bac,
      `${p.nombre_bacs}`,
      p.quantite_sortir,
    ];
    cx = M;
    vals.forEach((v, j) => {
      doc.setFontSize(7).setFont("helvetica", "normal");
      doc.text(v || "", cx + 1, y + 14 + i * 7);
      doc.rect(cx, y + 1 + i * 7, colProd[j], 7, "S");
      cx += colProd[j];
    });
  }

  // ── PIED : Visa ──
  y += 16 + Math.min(produits.length, 5) * 7 + 12;
  doc.setDrawColor(100);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 6;
  doc.setFontSize(9).setFont("helvetica", "bold");
  doc.text("VISA RESPONSABLE DU SITE", M, y);
  doc.setFont("helvetica", "normal");
  doc.text("___________________________", W - M - 30, y, { align: "right" });

  // ── WATERMARK si brouillon ──
  if (!data.signe) {
    doc.saveGraphicsState();
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(50);
    doc.setFont("helvetica", "bold");
    doc.text("BROUILLON", W / 2, 150, { align: "center", angle: 30 });
    doc.restoreGraphicsState();
  }

  return doc.output("blob");
}
