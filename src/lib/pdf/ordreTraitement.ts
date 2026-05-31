/**
 * FOR.PR6.003 — Ordre de Traitement Phytosanitaire
 * Reproduction fidele du formulaire papier officiel (noir & blanc)
 */
import jsPDF from "jspdf";

export interface OrdreTraitementData {
  site: string;
  n_traitement: string;
  date_prevue: string;
  parcelle_nom: string;
  superficie_ha?: number;
  culture: string;
  variete: string;
  cible: string;
  mode_application: string;
  materiel_utilise: string;
  vitesse_avancement_kmh?: number;
  pression_service_bar?: number;
  diametre_pastilles_mm?: number;
  produits: { nom_commercial: string; matiere_active: string; dose_hl: string; quantite_sortir: string }[];
  operateur_nom: string;
  operateur_visa?: string;
  date_reelle?: string;
  heure_debut?: string;
  heure_fin?: string;
  quantite_utilisee?: string;
  bouillon_citerne_l?: number;
  nb_citernes?: number;
  date_reentree?: string;
  dar_jours?: number;
  efficacite?: string;
  visa_rt?: string;
  signe: boolean;
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
    .replace(/[^\x00-\x7F]/g, "?"); // Fallback for any other non-ASCII
}

function fd(v?: string): string {
  if (!v) return "";
  try { return new Date(v).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}); }
  catch { return v; }
}

/* ── Low-level drawing ── */
function box(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(0); doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, "S");
}

function labelVal(
  doc: jsPDF,
  x: number, y: number, totalW: number, h: number,
  label: string, value: string,
  labelW?: number
) {
  const lw = labelW ?? Math.min(totalW * 0.45, 45);
  const vw = totalW - lw;
  box(doc, x, y, lw, h);
  box(doc, x + lw, y, vw, h);
  doc.setFont("helvetica","bold").setFontSize(7.5).setTextColor(0);
  doc.text(a(label), x + 1.5, y + h * 0.65);
  doc.setFont("helvetica","normal").setFontSize(8);
  doc.text(a(value), x + lw + 1.5, y + h * 0.65, { maxWidth: vw - 3 });
}

function fullLabelVal(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string) {
  box(doc, x, y, w, h);
  doc.setFont("helvetica","bold").setFontSize(7.5).setTextColor(0);
  doc.text(a(label), x + 1.5, y + h * 0.65);
  const lw = doc.getTextWidth(a(label)) + 3;
  doc.setFont("helvetica","normal").setFontSize(8);
  doc.text(a(value), x + lw + 1, y + h * 0.65, { maxWidth: w - lw - 3 });
}

function thCell(doc: jsPDF, x: number, y: number, w: number, h: number, label: string) {
  box(doc, x, y, w, h);
  doc.setFillColor(235, 235, 235); doc.rect(x, y, w, h, "F");
  box(doc, x, y, w, h);
  doc.setFont("helvetica","bold").setFontSize(7.5).setTextColor(0);
  doc.text(a(label), x + w/2, y + h * 0.65, { align: "center", maxWidth: w - 2 });
}

function tdCell(doc: jsPDF, x: number, y: number, w: number, h: number, value: string) {
  box(doc, x, y, w, h);
  doc.setFont("helvetica","normal").setFontSize(8).setTextColor(0);
  doc.text(a(value), x + 1.5, y + h * 0.65, { maxWidth: w - 3 });
}

export async function genererOrdreTraitementPDF(data: Partial<OrdreTraitementData>): Promise<Blob> {
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W = 210, M = 15, PW = W - 2*M;
  const R = 9; // standard row height

  /* ══ HEADER ══════════════════════════════════════════════ */
  // Title (centered, full width — no logo)
  doc.setFont("helvetica","bold").setFontSize(15).setTextColor(0);
  doc.text("ORDRE DE TRAITEMENT", W / 2, 22, { align:"center" });
  doc.setFontSize(9).setFont("helvetica","normal");
  doc.text(a("Phytosanitaire"), W / 2, 28, { align:"center" });

  // Reference box (top-right)
  box(doc, W - M - 35, 15, 35, 20);
  doc.setFont("helvetica","bold").setFontSize(8).setTextColor(0);
  doc.text("FOR.PR6.003",   W - M - 17.5, 21, { align:"center" });
  doc.setFont("helvetica","normal").setFontSize(7.5);
  doc.text("Version : A",   W - M - 17.5, 27, { align:"center" });
  doc.text("Page : 1 sur 1",W - M - 17.5, 32, { align:"center" });

  // Divider
  doc.setDrawColor(0).setLineWidth(0.5);
  doc.line(M, 37, W - M, 37);

  let y = 40;

  /* ══ SECTION 1 ══════════════════════════════════════════ */
  // Row 1: Site | N° Traitement | Date prevue
  const c1=55, c2=50, c3=PW-c1-c2;
  labelVal(doc, M,      y, c1, R, "Site :",          a(data.site||""), 18);
  labelVal(doc, M+c1,   y, c2, R, "N° Traitement :", a(data.n_traitement||""), 26);
  labelVal(doc, M+c1+c2,y, c3, R, "Date prevue de Traitement :", fd(data.date_prevue), 50);
  y += R;

  // Row 2: Parcelle | Culture | Variete
  labelVal(doc, M,      y, c1, R, "parcelle et superficie :", `${a(data.parcelle_nom||"")} (${data.superficie_ha??""} ha)`, 30);
  labelVal(doc, M+c1,   y, c2, R, "Culture :", a(data.culture||""), 18);
  labelVal(doc, M+c1+c2,y, c3, R, a("Variété :"), a(data.variete||""), 18);
  y += R;

  // Row 3: Cible full-width
  fullLabelVal(doc, M, y, PW, R, "Maladie/Ravageur/Cible :", a(data.cible||""));
  y += R;

  // Row 4: Mode | Materiel
  const modeW = 60, matW = PW - modeW;
  labelVal(doc, M,        y, modeW, R, "Mode d'application :", a(data.mode_application||""), 28);
  labelVal(doc, M+modeW,  y, matW,  R, a("Matériel utilisé :"), a(data.materiel_utilise||""), 28);
  y += R;

  // Row 5: Vitesse | Pression | Diam
  const v1=52, v2=52, v3=PW-v1-v2;
  labelVal(doc, M,      y, v1, R, "Vitesse d'avancement :", (data.vitesse_avancement_kmh && data.vitesse_avancement_kmh > 0) ? `${data.vitesse_avancement_kmh} km/h` : "", 32);
  labelVal(doc, M+v1,   y, v2, R, "Pression de service :", (data.pression_service_bar && data.pression_service_bar > 0) ? `${data.pression_service_bar} bar` : "", 30);
  labelVal(doc, M+v1+v2,y, v3, R, a("Ø des pastilles :"), (data.diametre_pastilles_mm && data.diametre_pastilles_mm > 0) ? `${data.diametre_pastilles_mm} mm` : "", 26);
  y += R + 4;

  /* ══ TABLE PRODUITS ══════════════════════════════════════ */
  const pc = [52, 52, 36, PW-140];
  thCell(doc, M,           y, pc[0], 10, "Produit\n(Nom commercial)");
  thCell(doc, M+pc[0],     y, pc[1], 10, a("Matière active"));
  thCell(doc, M+pc[0]+pc[1],y,pc[2], 10, "Dose (/hl)");
  thCell(doc, M+pc[0]+pc[1]+pc[2], y, pc[3], 10, a("Quantité du Produit à sortir"));
  y += 10;

  const prods = data.produits || [];
  const maxRows = Math.max(prods.length, 3); // Show at least 3 rows
  for (let i = 0; i < maxRows; i++) {
    const p = prods[i];
    tdCell(doc, M,                      y, pc[0], 10, a(p?.nom_commercial||""));
    tdCell(doc, M+pc[0],                y, pc[1], 10, a(p?.matiere_active||""));
    tdCell(doc, M+pc[0]+pc[1],          y, pc[2], 10, a(p?.dose_hl||""));
    tdCell(doc, M+pc[0]+pc[1]+pc[2],    y, pc[3], 10, a(p?.quantite_sortir||""));
    y += 10;
  }
  y += 6;

  /* ══ TABLE EXECUTION ══════════════════════════════════════ */
  const ec = [36, 28, 28, 26, 26, PW-144];
  const eLabels = [
    "Nom et visa de\nl'Operateur",
    "Date reelle\nd'application",
    "Heure de debut\nHeure de fin",
    a("Quantité de\nproduit utilisé"),
    "Bouillon par\nciterne",
    "Nombre de\nciterne",
  ];
  let cx = M;
  ec.forEach((w,i) => { thCell(doc, cx, y, w, 11, eLabels[i]); cx += w; });
  y += 11;

  cx = M;
  // Heures : n'afficher le "/" séparateur que si au moins une valeur est présente
  const heureStr = (data.heure_debut || data.heure_fin)
    ? `${data.heure_debut || "—"} / ${data.heure_fin || "—"}`
    : "";
  [
    a(`${data.operateur_nom||""}${data.operateur_visa ? ` / ${data.operateur_visa}` : ""}`),
    fd(data.date_reelle),
    heureStr,
    a(data.quantite_utilisee||""),
    data.bouillon_citerne_l ? `${data.bouillon_citerne_l} L` : "",
    data.nb_citernes ? `${data.nb_citernes}` : "",
  ].forEach((v,i) => { tdCell(doc, cx, y, ec[i], 12, v); cx += ec[i]; });
  y += 12 + 6;

  /* ══ TABLE DAR ═══════════════════════════════════════════ */
  const dc = [36, 24, PW - 100, 40];
  const dLabels = ["Date de reentree", "DAR", a("Efficacité du traitement ?"), "Visa Responsable\ntechnique"];
  cx = M;
  dc.forEach((w,i) => { thCell(doc, cx, y, w, 11, dLabels[i]); cx += w; });
  y += 11;

  cx = M;
  [
    fd(data.date_reentree),
    data.dar_jours ? `${data.dar_jours} j` : "",
    a(data.efficacite||""),
    a(data.visa_rt||""),
  ].forEach((v,i) => { tdCell(doc, cx, y, dc[i], 14, v); cx += dc[i]; });

  return doc.output("blob");
}
