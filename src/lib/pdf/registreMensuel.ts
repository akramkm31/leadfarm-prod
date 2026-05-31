/**
 * FOR.PR6.004 — Registre Mensuel des Traitements Phytosanitaires
 * Reproduction fidele du formulaire papier officiel
 */
import jsPDF from "jspdf";

export interface RegistreEntry {
  n: number;
  date_application: string;
  parcelle: string;
  cible: string;
  produits: string;          // "Produit1 + Produit2"
  dar: string;               // "21 j"
  date_recolte_permise: string;
  quantite_melange: string;  // "500 L"
  dose: string;              // "2 L/hl"
  quantite_produit: string;  // "10 L"
  materiel: string;
  operateurs: string;
}

export interface RegistreMensuelData {
  site: string;
  mois: string;     // "Avril 2026"
  campagne: string; // "2025-2026"
  entries: RegistreEntry[];
}

function a(t: string | undefined | null): string {
  if (!t) return "";
  return t
    .replace(/[àáâãäå]/g,"a").replace(/[ÀÁÂÃÄÅ]/g,"A")
    .replace(/[éèêë]/g,"e").replace(/[ÉÈÊË]/g,"E")
    .replace(/[ìíîï]/g,"i").replace(/[ÌÍÎÏ]/g,"I")
    .replace(/[òóôõöø]/g,"o").replace(/[ÒÓÔÕÖØ]/g,"O")
    .replace(/[ùúûü]/g,"u").replace(/[ÙÚÛÜ]/g,"U")
    .replace(/ç/g,"c").replace(/Ç/g,"C")
    .replace(/ñ/g,"n").replace(/Ñ/g,"N")
    .replace(/œ/g,"oe").replace(/æ/g,"ae")
    .replace(/[°º]/g,"deg")
    .replace(/[’‘]/g,"'")
    .replace(/[“”]/g,'"')
    .replace(/∅/g,"O")
    .replace(/[^\x00-\x7F]/g, "?");
}

function box(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(0).setLineWidth(0.25);
  doc.rect(x, y, w, h, "S");
}

function thCell(doc: jsPDF, x: number, y: number, w: number, h: number, label: string) {
  doc.setFillColor(225, 225, 225);
  doc.rect(x, y, w, h, "F");
  box(doc, x, y, w, h);
  doc.setFont("helvetica","bold").setFontSize(6.2).setTextColor(0);
  // Multi-line support
  const lines = label.split("\n");
  const lineH = h / (lines.length + 0.5);
  lines.forEach((l, i) => {
    doc.text(a(l), x + w/2, y + lineH * (i + 0.9), { align:"center", maxWidth: w - 1.5 });
  });
}

function tdCell(doc: jsPDF, x: number, y: number, w: number, h: number, value: string, shade = false) {
  if (shade) { doc.setFillColor(248, 248, 248); doc.rect(x, y, w, h, "F"); }
  box(doc, x, y, w, h);
  doc.setFont("helvetica","normal").setFontSize(6.5).setTextColor(0);
  doc.text(a(value||""), x + 1, y + h * 0.6, { maxWidth: w - 2 });
}

export async function genererRegistreMensuelPDF(data: RegistreMensuelData): Promise<Blob> {
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
  const W = 297, M = 10, PW = W - 2*M;
  const R = 8.5;

  /* ══ HEADER ══════════════════════════════════════════════ */
  box(doc, M, 8, 22, 16);
  doc.setFont("helvetica","normal").setFontSize(6).setTextColor(150);
  doc.text("Logo", M + 11, 17, { align:"center" });

  doc.setFont("helvetica","bold").setFontSize(14).setTextColor(0);
  doc.text("REGISTRE MENSUEL DES TRAITEMENTS", M + 22 + (PW - 57)/2, 14, { align:"center" });
  doc.setFont("helvetica","normal").setFontSize(8);
  doc.text(a("Phytosanitaires — Domaine Khelifa"), M + 22 + (PW - 57)/2, 20, { align:"center" });

  box(doc, W - M - 37, 8, 37, 16);
  doc.setFont("helvetica","bold").setFontSize(8).setTextColor(0);
  doc.text("FOR.PR6.004",    W - M - 18.5, 13.5, { align:"center" });
  doc.setFont("helvetica","normal").setFontSize(7);
  doc.text("Version : A",    W - M - 18.5, 18,   { align:"center" });
  doc.text("Page : 1 sur 1", W - M - 18.5, 22.5, { align:"center" });

  doc.setDrawColor(0).setLineWidth(0.5);
  doc.line(M, 26, W - M, 26);

  let y = 29;

  /* ══ META ROW ══════════════════════════════════════════ */
  const mw = PW / 3;
  box(doc, M,        y, mw,   R, );
  box(doc, M+mw,     y, mw,   R);
  box(doc, M+mw*2,   y, mw,   R);

  doc.setFont("helvetica","bold").setFontSize(7.5).setTextColor(0);
  doc.text("Site", M + 14, y + R*0.65);
  doc.setFont("helvetica","normal");
  doc.text(a(data.site), M + 22, y + R*0.65);

  doc.setFont("helvetica","bold");
  doc.text("Mois", M + mw + 2, y + R*0.65);
  doc.setFont("helvetica","normal");
  doc.text(a(data.mois), M + mw + 14, y + R*0.65);

  doc.setFont("helvetica","bold");
  doc.text("Campagne", M + mw*2 + 2, y + R*0.65);
  doc.setFont("helvetica","normal");
  doc.text(a(data.campagne), M + mw*2 + 22, y + R*0.65);
  y += R + 2;

  /* ══ TABLE ══════════════════════════════════════════════ */
  // Column widths — total = PW = 277
  const cols = [
    { label: "N°",                    w: 8  },
    { label: "Date\nd'application",   w: 20 },
    { label: "Parcelle",              w: 24 },
    { label: "Cible",                 w: 28 },
    { label: "Produits",              w: 38 },
    { label: "DAR",                   w: 12 },
    { label: "Date de\nrecolte\npermise", w: 20 },
    { label: a("Quantité de\nmélange"), w: 18 },
    { label: "Dose",                  w: 16 },
    { label: a("Quantité de\nproduit"), w: 18 },
    { label: a("Matériel\nutilisé"),  w: 26 },
    { label: a("Opérateurs"),         w: 49 },
  ];

  // Header
  let cx = M;
  cols.forEach(c => { thCell(doc, cx, y, c.w, 14, c.label); cx += c.w; });
  y += 14;

  // Rows — fill 10 rows minimum
  const totalRows = Math.max(data.entries.length, 10);
  for (let i = 0; i < totalRows; i++) {
    const e = data.entries[i];
    const shade = i % 2 === 1;
    const rowH = 9;
    cx = M;
    [
      e ? String(e.n) : "",
      e ? a(e.date_application) : "",
      e ? a(e.parcelle) : "",
      e ? a(e.cible) : "",
      e ? a(e.produits) : "",
      e ? a(e.dar) : "",
      e ? a(e.date_recolte_permise) : "",
      e ? a(e.quantite_melange) : "",
      e ? a(e.dose) : "",
      e ? a(e.quantite_produit) : "",
      e ? a(e.materiel) : "",
      e ? a(e.operateurs) : "",
    ].forEach((v, ci) => { tdCell(doc, cx, y, cols[ci].w, rowH, v, shade); cx += cols[ci].w; });
    y += rowH;
  }
  y += 6;

  /* ══ SIGNATURE ══════════════════════════════════════════ */
  doc.setFont("helvetica","bold").setFontSize(8).setTextColor(0);
  doc.text("VISA RESPONSABLE SITE", W / 2, y, { align:"center" });
  y += 10;
  doc.setDrawColor(0).setLineWidth(0.3);
  doc.line(W/2 - 35, y, W/2 + 35, y);
  doc.setFont("helvetica","normal").setFontSize(7);
  doc.text("Signature + cachet", W/2, y + 4, { align:"center" });

  /* ══ FOOTER ══════════════════════════════════════════════ */
  doc.setFont("helvetica","normal").setFontSize(6.5).setTextColor(100);
  doc.text(
    `Domaine Khelifa - Sidi Bel Abbes  |  FOR.PR6.004 Rev.A  |  Imprime le ${new Date().toLocaleDateString("fr-FR")}`,
    W/2, 200, { align:"center" }
  );

  return doc.output("blob");
}
