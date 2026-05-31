/**
 * GÉNÉRATEUR PDF UNIFIÉ — VERSION AMÉLIORÉE
 * "REGISTRE & ORDRE DE TRAITEMENT AGRICOLE"
 *
 * Fusionne FOR.PR6.003 (Ordre) + FOR.PR6.004 (Registre mensuel)
 * Design : formulaire officiel, bordures, cases, espace écriture manuscrite
 * Fidélité : le PDF montre EXACTEMENT ce qui est rempli dans le formulaire
 *
 * Utilisation : A4 portrait (2 pages max)
 */

import jsPDF from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LigneTraitement {
  numero: number;
  date: string;
  parcelle: string;
  cible: string;
  produit: string;
  matiereActive: string;
  dose: string;
  dar: string;
  quantiteMelange: string;
  quantiteProduit: string;
  materiel: string;
  operateur: string;
}

export interface RegistreOrdreData {
  /* ── Header ── */
  site: string;
  campagne?: string;
  mois?: string;

  /* ── Infos générales ── */
  parcelle: string;
  superficie: string;
  culture: string;
  variete: string;
  responsableTechnique: string;
  operateur: string;

  /* ── Planification (Ordre) ── */
  nTraitement: string;
  datePrevue: string;
  cible: string;
  modeApplication: string;
  materiel: string;
  vitesseAvancement: string;
  pressionService: string;

  /* ── Exécution ── */
  dateReelle: string;
  heureDebut: string;
  heureFin: string;
  quantiteProduitUtilisee: string;
  bouillieParCiterne: string;
  nombreCiternes: string;
  conditionsMeteo: string;

  /* ── Lignes du registre ── */
  lignes: LigneTraitement[];

  /* ── Suivi & Validation ── */
  dateReentree: string;
  efficacite: string;
  visaResponsable: string;
  signatureOperateur: string;
  signe: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fmt(d: string): string {
  if (!d || d === "__________" || d === "______________") return "";
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch {
    return d;
  }
}

function v(s: string | undefined | null): string {
  return s && s.trim() ? s.trim() : "";
}

// ─── Génération PDF ───────────────────────────────────────────────────────────

export async function genererRegistreOrdrePDF(
  data: Partial<RegistreOrdreData>
): Promise<Blob> {
  const d = data as RegistreOrdreData;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 12;
  const pageW = W - 2 * M;
  let y = M;
  let page = 1;

  // ─── Fonction champ avec cadre ──
  function champ(
    label: string,
    valeur: string | undefined,
    x: number,
    yy: number,
    w: number,
    h: number = 8
  ) {
    doc.setDrawColor(80);
    doc.setLineWidth(0.3);
    doc.rect(x, yy, w, h, "S");
    doc.setFontSize(6.5).setFont("helvetica", "bold");
    doc.setTextColor(60);
    doc.text(a(label), x + 1.5, yy + 3);
    doc.setFontSize(8).setFont("helvetica", "normal");
    doc.setTextColor(0);
    const val = v(valeur);
    if (val) {
      doc.text(a(val), x + 1.5, yy + h - 2.5);
    } else {
      doc.setDrawColor(200);
      doc.setLineWidth(0.15);
      doc.line(x + 1.5, yy + h - 3, x + w - 1.5, yy + h - 3);
    }
  }

  // ─── Fonction ligne de tableau ──
  function rowTable(
    cells: string[],
    colWs: number[],
    x: number,
    yy: number,
    h: number = 7,
    header: boolean = false
  ) {
    let cx = x;
    cells.forEach((cell, i) => {
      if (header) {
        doc.setFillColor(50, 50, 50);
        doc.setTextColor(255);
        doc.setFontSize(6).setFont("helvetica", "bold");
        doc.rect(cx, yy, colWs[i], h, "F");
        doc.text(cell, cx + 1, yy + h - 2);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(150);
        doc.setLineWidth(0.2);
        doc.rect(cx, yy, colWs[i], h, "S");
        doc.setTextColor(0);
        doc.setFontSize(5.5).setFont("helvetica", "normal");
        const val = v(cell);
        if (val) {
          const maxChars = Math.floor((colWs[i] - 2) / 1.8);
          const txt = val.length > maxChars ? val.slice(0, maxChars - 1) + "…" : val;
          doc.text(a(txt), cx + 1, yy + h - 2);
        }
      }
      cx += colWs[i];
    });
    doc.setTextColor(0);
  }

  // ══════════════════════════════════════════════════════════════════
  //  HEADER
  // ══════════════════════════════════════════════════════════════════

  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.rect(M - 1, y - 3, pageW + 2, 18, "S");
  doc.setFontSize(13).setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("REGISTRE & ORDRE DE TRAITEMENT AGRICOLE", W / 2, y + 5, { align: "center" });
  doc.setFontSize(6.5).setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text("Document unifié de planification, exécution et conformité réglementaire", W / 2, y + 12, { align: "center" });
  doc.setTextColor(100);
  doc.setFontSize(5);
  doc.text("FOR.PR6.003/004  Ver. A", W - M, y + 1, { align: "right" });
  y += 19;

  // ══════════════════════════════════════════════════════════════════
  //  1. INFORMATIONS GÉNÉRALES
  // ══════════════════════════════════════════════════════════════════

  doc.setFillColor(235, 235, 235);
  doc.rect(M, y, pageW, 6, "F");
  doc.setFontSize(7.5).setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text("1. INFORMATIONS GÉNÉRALES", M + 2, y + 4.5);
  y += 8;

  const r1 = [
    { label: "Site", value: d.site, w: 55 },
    { label: "Campagne", value: d.campagne, w: 35 },
    { label: "Mois", value: d.mois, w: 45 },
    { label: "Responsable technique", value: d.responsableTechnique, w: pageW - 135 },
  ];
  let cx = M;
  r1.forEach((c) => {
    champ(c.label, c.value, cx, y, c.w);
    cx += c.w + 1;
  });
  y += 9;

  const r2 = [
    { label: "Parcelle", value: d.parcelle, w: 55 },
    { label: "Superficie", value: d.superficie, w: 30 },
    { label: "Culture", value: d.culture, w: 35 },
    { label: "Variété", value: d.variete, w: 40 },
    { label: "Opérateur", value: d.operateur, w: pageW - 160 },
  ];
  cx = M;
  r2.forEach((c) => {
    champ(c.label, c.value, cx, y, c.w);
    cx += c.w + 1;
  });
  y += 12;

  // ══════════════════════════════════════════════════════════════════
  //  2. PLANIFICATION DU TRAITEMENT
  // ══════════════════════════════════════════════════════════════════

  doc.setFillColor(235, 235, 235);
  doc.rect(M, y, pageW, 6, "F");
  doc.setFontSize(7.5).setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text("2. PLANIFICATION DU TRAITEMENT (ORDRE)", M + 2, y + 4.5);
  y += 8;

  const p1 = [
    { label: "N° Traitement", value: d.nTraitement, w: 45 },
    { label: "Date prévue", value: fmt(d.datePrevue), w: 35 },
    { label: "Cible (maladie / ravageur)", value: d.cible, w: 60 },
    { label: "Mode d'application", value: d.modeApplication, w: pageW - 140 },
  ];
  cx = M;
  p1.forEach((c) => {
    champ(c.label, c.value, cx, y, c.w);
    cx += c.w + 1;
  });
  y += 9;

  const p2 = [
    { label: "Matériel utilisé", value: d.materiel, w: 80 },
    { label: "Vitesse d'avancement", value: `${v(d.vitesseAvancement)} km/h`, w: 50 },
    { label: "Pression de service", value: `${v(d.pressionService)} bar`, w: pageW - 130 },
  ];
  cx = M;
  p2.forEach((c) => {
    champ(c.label, c.value, cx, y, c.w);
    cx += c.w + 1;
  });
  y += 12;

  // ══════════════════════════════════════════════════════════════════
  //  3. EXÉCUTION DU TRAITEMENT
  // ══════════════════════════════════════════════════════════════════

  doc.setFillColor(235, 235, 235);
  doc.rect(M, y, pageW, 6, "F");
  doc.setFontSize(7.5).setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text("3. EXÉCUTION DU TRAITEMENT", M + 2, y + 4.5);
  y += 8;

  const e1 = [
    { label: "Date réelle", value: fmt(d.dateReelle), w: 35 },
    { label: "Heure début", value: d.heureDebut || "___:___", w: 28 },
    { label: "Heure fin", value: d.heureFin || "___:___", w: 28 },
    { label: "Qté produit utilisée", value: d.quantiteProduitUtilisee, w: 40 },
    { label: "Bouillie / citerne", value: `${v(d.bouillieParCiterne)} L`, w: 35 },
    { label: "Nbre citernes", value: d.nombreCiternes, w: 25 },
  ];
  cx = M;
  e1.forEach((c) => {
    champ(c.label, c.value, cx, y, c.w);
    cx += c.w + 1;
  });
  y += 9;

  champ("Conditions météo (vent, T°, humidité)", d.conditionsMeteo, M, y, pageW);
  y += 12;

  // ══════════════════════════════════════════════════════════════════
  //  4. REGISTRE MENSUEL — TABLEAU
  // ══════════════════════════════════════════════════════════════════

  doc.setFillColor(235, 235, 235);
  doc.rect(M, y, pageW, 6, "F");
  doc.setFontSize(7.5).setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text("4. REGISTRE MENSUEL DES TRAITEMENTS", M + 2, y + 4.5);
  y += 8;

  const tblCols = [8, 16, 22, 18, 28, 28, 12, 16, 16, 24, 24, pageW - 212];
  const tblHeaders = [
    "N°", "Date", "Parcelle", "Cible", "Produit", "Matière active",
    "Dose", "Qté mél.", "Qté prod.", "Matériel", "Opérateur",
  ];

  rowTable(tblHeaders, tblCols, M, y, 7, true);
  y += 7;

  const lignes = d.lignes && d.lignes.length > 0 ? d.lignes : [];
  const nbLignes = Math.max(lignes.length, 5);

  for (let i = 0; i < nbLignes; i++) {
    if (y > H - 45) {
      doc.addPage();
      page++;
      y = M;
      doc.setFillColor(235, 235, 235);
      doc.rect(M, y, pageW, 6, "F");
      doc.setFontSize(7).setFont("helvetica", "bold");
      doc.setTextColor(30);
      doc.text("4. REGISTRE MENSUEL DES TRAITEMENTS (suite)", M + 2, y + 4.5);
      y += 8;
      rowTable(tblHeaders, tblCols, M, y, 7, true);
      y += 7;
    }

    const l = lignes[i];
    const vals = l
      ? [
          String(l.numero),
          fmt(l.date) || "______",
          l.parcelle || "",
          l.cible || "",
          l.produit || "",
          l.matiereActive || "",
          l.dose || "",
          l.quantiteMelange || "",
          l.quantiteProduit || "",
          l.materiel || "",
          l.operateur || "",
        ]
      : Array(11).fill("");

    rowTable(vals, tblCols, M, y, 7, false);

    if (!l) {
      let cx2 = M;
      tblCols.forEach((cw) => {
        doc.setDrawColor(180);
        doc.setLineWidth(0.15);
        doc.rect(cx2, y, cw, 7, "S");
        cx2 += cw;
      });
    }

    y += 7;
  }

  y += 4;

  // ══════════════════════════════════════════════════════════════════
  //  5. SUIVI & VALIDATION
  // ══════════════════════════════════════════════════════════════════

  if (y > H - 45) {
    doc.addPage();
    page++;
    y = M;
  }

  doc.setFillColor(235, 235, 235);
  doc.rect(M, y, pageW, 6, "F");
  doc.setFontSize(7.5).setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text("5. SUIVI & VALIDATION", M + 2, y + 4.5);
  y += 8;

  const s1 = [
    { label: "Date de réentrée", value: fmt(d.dateReentree), w: 50 },
    { label: "Efficacité du traitement", value: d.efficacite, w: pageW - 50 },
  ];
  cx = M;
  s1.forEach((c) => {
    champ(c.label, c.value, cx, y, c.w);
    cx += c.w + 1;
  });
  y += 12;

  // ── Zone de signature ──
  doc.setDrawColor(80);
  doc.setLineWidth(0.4);

  const sigW = (pageW - 3) / 2;

  // Visa Responsable Technique
  doc.rect(M, y, sigW, 22, "S");
  doc.setFontSize(7).setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text("Visa du Responsable Technique", M + 2, y + 4);
  doc.setFontSize(6).setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Nom, date et signature", M + 2, y + 9);
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(M + 2, y + 18, M + sigW - 2, y + 18);
  if (d.visaResponsable) {
    doc.setFontSize(7).setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.text(d.visaResponsable, M + 2, y + 17);
  }

  // Signature Opérateur
  const sigX = M + sigW + 3;
  doc.rect(sigX, y, sigW, 22, "S");
  doc.setFontSize(7).setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text("Signature de l'Opérateur", sigX + 2, y + 4);
  doc.setFontSize(6).setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Nom, date et signature", sigX + 2, y + 9);
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(sigX + 2, y + 18, sigX + sigW - 2, y + 18);
  if (d.signatureOperateur) {
    doc.setFontSize(7).setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.text(d.signatureOperateur, sigX + 2, y + 17);
  }

  y += 26;

  // ── Mention légale ──
  doc.setFontSize(5.5).setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(
    "Document généré par LeadFarm — Conforme à l'arrêté ministériel n° 1275 du 04/03/1994",
    M, y
  );

  // ── Watermark BROUILLON ──
  if (!d.signe) {
    doc.saveGraphicsState();
    doc.setTextColor(210, 210, 210);
    doc.setFontSize(55);
    doc.setFont("helvetica", "bold");
    for (let pg = 1; pg <= page; pg++) {
      doc.setPage(pg);
      doc.text("BROUILLON", W / 2, H / 2, { align: "center", angle: 25 });
    }
    doc.restoreGraphicsState();
  }

  // ── Pied de page ──
  for (let pg = 1; pg <= page; pg++) {
    doc.setPage(pg);
    doc.setFontSize(5).setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text(`FOR.PR6.003/004 — Page ${pg} / ${page}`, M, H - 6);
    if (d.nTraitement) {
      doc.text(`N° Traitement: ${d.nTraitement}`, W / 2, H - 6, { align: "center" });
    }
    doc.text(new Date().toLocaleDateString("fr-FR"), W - M, H - 6, { align: "right" });
  }

  return doc.output("blob");
}
