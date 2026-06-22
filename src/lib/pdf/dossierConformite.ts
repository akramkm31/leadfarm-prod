/**
 * Dossier de conformité export — vérification LMR + checklist INPV.
 * Génère un PDF réel (jsPDF) téléchargeable, conforme aux exigences audit export.
 */
import jsPDF from "jspdf";

export interface DossierLMRRow {
  produit_nom: string;
  matiere_active: string;
  residu_estime_mg_kg: number;
  lmr_mg_kg: number | null;
  marge: number | null;
  statut: string;
}

export interface DossierChecklistRow {
  label: string;
  checked: boolean;
}

export interface DossierConformiteData {
  site: string;
  pays_cible: string;
  date_recolte: string;
  statut_global: string;
  lmr_rows: DossierLMRRow[];
  checklist: DossierChecklistRow[];
  generated_at: string;
}

function a(t: string | number | undefined | null): string {
  if (t === undefined || t === null) return "";
  return String(t)
    .replace(/[àáâãäå]/g, "a").replace(/[ÀÁÂÃÄÅ]/g, "A")
    .replace(/[éèêë]/g, "e").replace(/[ÉÈÊË]/g, "E")
    .replace(/[ìíîï]/g, "i").replace(/[ÌÍÎÏ]/g, "I")
    .replace(/[òóôõöø]/g, "o").replace(/[ÒÓÔÕÖØ]/g, "O")
    .replace(/[ùúûü]/g, "u").replace(/[ÙÚÛÜ]/g, "U")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
    .replace(/[°º]/g, "deg")
    .replace(/[^\x00-\x7F]/g, "?");
}

export function genererDossierConformitePDF(data: DossierConformiteData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  let y = 18;

  // Header
  doc.setFillColor(32, 59, 20);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("DOSSIER DE CONFORMITE EXPORT", M, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(a(`${data.site}  -  Verification LMR & Checklist INPV`), M, 20);
  doc.text(a(`Genere le ${data.generated_at}`), M, 25);

  y = 38;
  doc.setTextColor(20, 20, 20);

  // Meta block
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const meta: [string, string][] = [
    ["Pays cible d'export", data.pays_cible],
    ["Date de recolte prevue", data.date_recolte],
    ["Statut global LMR", data.statut_global.toUpperCase()],
  ];
  meta.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.text(a(label), M, y);
    doc.setFont("helvetica", "bold");
    doc.text(a(value), M + 70, y);
    y += 6;
  });

  y += 4;

  // LMR table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("1. Analyse des Limites Maximales de Residus (LMR)", M, y);
  y += 6;

  const cols = [M, M + 42, M + 78, M + 110, M + 140, M + 165];
  const headers = ["Produit", "Mat. active", "Residu", "LMR", "Marge", "Statut"];
  doc.setFillColor(224, 229, 213);
  doc.rect(M, y - 4, W - M * 2, 6, "F");
  doc.setFontSize(7.5);
  headers.forEach((h, i) => doc.text(a(h), cols[i], y));
  y += 5;

  doc.setFont("helvetica", "normal");
  if (data.lmr_rows.length === 0) {
    doc.text(a("Aucun resultat LMR — selectionnez des traitements et lancez la verification."), M, y);
    y += 6;
  } else {
    data.lmr_rows.forEach((r) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(a(r.produit_nom).slice(0, 22), cols[0], y);
      doc.text(a(r.matiere_active).slice(0, 18), cols[1], y);
      doc.text(`${r.residu_estime_mg_kg.toFixed(4)}`, cols[2], y);
      doc.text(r.lmr_mg_kg !== null ? `${r.lmr_mg_kg}` : "N/D", cols[3], y);
      doc.text(r.marge !== null ? `${(r.marge * 100).toFixed(0)}%` : "-", cols[4], y);
      doc.text(a(r.statut).toUpperCase(), cols[5], y);
      y += 5.5;
    });
  }

  y += 6;
  if (y > 250) { doc.addPage(); y = 20; }

  // INPV checklist
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const score = data.checklist.filter((c) => c.checked).length;
  doc.text(a(`2. Checklist INPV Algerie (${score}/${data.checklist.length} valides)`), M, y);
  y += 6;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  data.checklist.forEach((c) => {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.text(c.checked ? "[X]" : "[ ]", M, y);
    doc.text(a(c.label).slice(0, 90), M + 8, y);
    y += 5.5;
  });

  // Footer / integrity
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      a("Reference: FOR.PR6.004 / CE 396-2005 / Arrete n.1275 INPV  -  Document genere par LeadFarm"),
      M,
      290
    );
    doc.text(`${p}/${pages}`, W - M, 290, { align: "right" });
  }

  return doc.output("blob");
}
