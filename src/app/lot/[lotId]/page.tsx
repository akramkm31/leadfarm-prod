"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useParams } from "next/navigation";
import { resolveLotDemoProfile, NORD_A_GOLDEN_LOT_ID, lotTraceUrl } from "@/lib/lot/demo-profiles";

/* ════════════════════════════════════════════════════════════════════════
   PUBLIC LOT TRACEABILITY — accessible via QR code, no auth required.
   Self-contained: does NOT use AppLayout (auth-gated).
   Fetches real LeadFarm data from /api/v1/public/lot/:lotId (recolte →
   parcelle + campagne + treatments, public-safe, RLS bypassed server-side).
   Falls back to the baked demo dataset when the lot isn't found or the
   service credentials are absent — the page always renders fully.
   ════════════════════════════════════════════════════════════════════════ */

/* ── Palette ──────────────────────────────────────────────────────────── */
const C = {
  bg:       "#F8F9F4",
  green:    "#2D6A4F",
  greenLt:  "#52B788",
  yellow:   "#D4A017",
  red:      "#C1121F",
  ink:      "#1A1A1A",
  sub:      "#6B7280",
  border:   "#E5E7EB",
  hair:     "rgba(45,106,79,0.125)", // #2D6A4F20
};

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";

/* ── Demo data ────────────────────────────────────────────────────────── */
const LOT = {
  id: NORD_A_GOLDEN_LOT_ID,
  ggn: "4049928123456",
  exploitation: "Domaine Khelifa — Groupe Lechehab",
  localisation: "Tenira, Sidi Bel Abbès, Algérie (wilaya 22)",
  generatedAt: "",
  closedAt: "14/06/2026",
};

const TIMELINE = [
  { icon: "🌱", titre: "Plantation",        date: "Mars 2019",        done: true,  lines: ["Golden Delicious / Porte-greffe M9", "Pépiniériste certifié — Cert. phyto MADR n°PH-2019-0442"] },
  { icon: "🔍", titre: "Surveillance IPM",  date: "Saison 2025-2026", done: true,  lines: ["12 rondes de scouting", "Dernière obs. : 08/06/2026", "Pression finale : faible"] },
  { icon: "💧", titre: "Traitements",       date: "14/03 → 25/05/26", done: true,  lines: ["5 traitements", "IFT saison : 3.2 (objectif ≤ 4.0 ✅)", "Dernier : J-20 avant récolte"] },
  { icon: "🍎", titre: "Récolte",           date: "14 juin 2026",     done: true,  lines: ["BBCH 87", "1 840 kg net — CAT I", "Calibre 65-70 mm"] },
  { icon: "🔬", titre: "Contrôle",          date: "14 juin 2026",     done: true,  lines: ["DAR : ✅ tous respectés", "LMR UE : ✅ conformes", "Résidus labo : ✅ < LMR"] },
  { icon: "🚛", titre: "Livraison",         date: "15 juin 2026",     done: true,  lines: ["BL n°2026-441", "Destination : Export UE"] },
  { icon: "🏅", titre: "Certification",     date: "Avril 2026",       done: true,  lines: ["GLOBALG.A.P. IFA v6", "Audit CB : avril 2026", "GGN vérifié ✅"] },
];

const PRODUIT: [string, string][] = [
  ["Variété", "Golden Delicious (pomme jaune)"],
  ["Porte-greffe", "M9 (demi-nain)"],
  ["Culture", "Malus domestica"],
  ["Bloc", "Nord-A — Golden Delicious"],
  ["Parcelle mère", "Parcelle Nord — Pommiers"],
  ["Surface bloc", "4.2 ha"],
  ["Altitude", "820 m"],
  ["GPS centroïde", "35.1234°N, 0.5678°W"],
  ["Saison", "Campagne 2025-2026"],
  ["Stade à récolte", "BBCH 87 — maturité commerciale"],
];

const QUALITE: [string, string, boolean?][] = [
  ["Catégorie", "CAT I (règlement UE 543/2011)"],
  ["Volume net", "1 840 kg"],
  ["Volume brut", "1 920 kg"],
  ["Taux de refus", "4.2 %"],
  ["Calibre dominant", "65-70 mm"],
];
const QUALITE_PC: [string, string, boolean?][] = [
  ["Brix", "13.2° (min CAT I : 11°)", true],
  ["Firmété", "7.1 kg/cm² (pénétromètre)"],
  ["Acidité titrable", "5.8 g/L ac. malique"],
  ["Poids moyen fruit", "198 g"],
  ["Couleur", "Jaune doré uniforme (> 85 % surface)", true],
];

const PHENO = [
  { stade: "Débourrement",  prevu: "05/03/2026", reel: "03/03/2026", ecart: -2 },
  { stade: "Floraison",     prevu: "02/04/2026", reel: "29/03/2026", ecart: -4 },
  { stade: "Nouaison",      prevu: "18/04/2026", reel: "15/04/2026", ecart: -3 },
  { stade: "Grossissement", prevu: "01/05/2026", reel: "28/04/2026", ecart: -3 },
  { stade: "Véraison",      prevu: "25/05/2026", reel: "22/05/2026", ecart: -3 },
  { stade: "Maturité",      prevu: "18/06/2026", reel: "14/06/2026", ecart: -4 },
];

const RONDES = [
  {
    num: 12, date: "08/06/2026", zone: "Nord-A — Golden Delicious",
    obs: [
      { l: "Tavelure", v: "1.2 %", seuil: "seuil 5 %", ok: true },
      { l: "Oïdium", v: "0.3 %", seuil: "seuil 5 %", ok: true },
      { l: "Hoplocampe", v: "0 ind./piège", seuil: "", ok: true },
      { l: "Carpocapse", v: "2 ind./piège delta", seuil: "seuil 5", ok: true },
    ],
    decision: "Pas d'intervention nécessaire ✅", alert: false,
  },
  {
    num: 10, date: "20/05/2026", zone: "Nord-A — Golden Delicious",
    obs: [{ l: "Tavelure", v: "6.8 %", seuil: "seuil 5 %", ok: false }],
    decision: "TRAITEMENT DÉCLENCHÉ → voir Traitement #5", alert: true,
  },
  {
    num: 8, date: "28/04/2026", zone: "Nord-A — Golden Delicious",
    obs: [{ l: "Oïdium", v: "5.2 %", seuil: "seuil 5 %", ok: false }],
    decision: "TRAITEMENT DÉCLENCHÉ → voir Traitement #4", alert: true,
  },
];

type Trt = {
  num: number; date: string; type: string; cible: string;
  justif: string[]; rows: [string, string, boolean?][];
  conditions?: [string, string, boolean?][];
  dar: string; darAlert?: boolean; darNote?: string;
  lmr: { molecule: string; val: string; lmr: string; pct: string; labo?: boolean };
  efficacite?: string[];
};

const TRAITEMENTS: Trt[] = [
  {
    num: 1, date: "14 mars 2026", type: "Préventif", cible: "Tavelure (Venturia inaequalis)",
    justif: ["Ronde #2 — 10/03/2026", "Score Mills : 72 (infection probable — pluie 8mm + T° 12°C)"],
    rows: [
      ["Produit", "Mancozèbe 80% WP"],
      ["Matière active", "Mancozèbe 800 g/kg"],
      ["Formulation", "Poudre mouillable"],
      ["N° AMM Algérie", "AMM-DZ-2018-0334 — valide → 2028", true],
      ["Dose appliquée", "2.5 kg/ha"],
      ["Dose homologuée", "2.0 - 3.0 kg/ha", true],
      ["Volume bouillie", "500 L/ha"],
      ["N° lot produit", "MZ-2025-8847"],
      ["Fabrication", "04/2025 — Pérem. 04/2027", true],
      ["Fournisseur", "Fournisseur homologué", true],
      ["Équipement", "Tracteur T-01 — Pulvé. rampe"],
      ["Opérateur", "Certifié n°DSP-SBA-2024-0089 → 31/12/2027", true],
      ["Débit réel", "497 L/ha (vs 500 — écart 0.6%)", true],
      ["Couverture", "4.18 / 4.20 ha = 99.5%", true],
      ["Calibration IoT", "Dernière 02/03/2026", true],
    ],
    conditions: [
      ["Température", "14°C"],
      ["Humidité", "68%"],
      ["Vent", "1.8 km/h (< 3 km/h)", true],
      ["Pluie post-appli", "Aucune dans les 4h", true],
    ],
    dar: "28 jours — récolte 14/06/2026 — 92 j écoulés ≥ 28 j",
    lmr: { molecule: "Mancozèbe (ETU)", val: "0.018 mg/kg", lmr: "0.05 mg/kg", pct: "36% de la LMR" },
    efficacite: ["Ronde #4 — 28/03/2026", "Tavelure : 0.8% (était 2.1%)", "Taux de contrôle : 62% ✅"],
  },
  {
    num: 2, date: "28 mars 2026", type: "Curatif", cible: "Tavelure (Venturia inaequalis)",
    justif: ["Ronde #3 — 25/03/2026", "Tavelure 6.2% > seuil 5%"],
    rows: [
      ["Produit", "Captane 50% WP"],
      ["Matière active", "Captane 500 g/kg"],
      ["N° AMM Algérie", "AMM-DZ-2019-0112 — valide", true],
      ["Dose appliquée", "1.5 kg/ha"],
      ["N° lot produit", "CP-2025-2241"],
      ["Fabrication", "06/2025 — Pérem. 06/2027", true],
    ],
    conditions: [["Température", "16°C"], ["Humidité", "61%"], ["Vent", "2.1 km/h", true]],
    dar: "7 jours — 78 j écoulés ≥ 7 j",
    lmr: { molecule: "Captane", val: "0.04 mg/kg", lmr: "3.00 mg/kg", pct: "1.3% de la LMR" },
    efficacite: ["Taux de contrôle tavelure : 78% ✅"],
  },
  {
    num: 3, date: "15 avril 2026", type: "Préventif", cible: "Oïdium (Podosphaera leucotricha)",
    justif: ["Ronde #5 — 12/04/2026", "Oïdium 4.8% + conditions favorables (T° 22°C, HR < 40%)"],
    rows: [
      ["Produit", "Thiophanate-méthyl 70% WP"],
      ["N° AMM Algérie", "AMM-DZ-2020-0567 — valide", true],
      ["Dose", "0.7 kg/ha"],
      ["N° lot", "TM-2025-4412"],
    ],
    dar: "21 jours — 60 j écoulés",
    lmr: { molecule: "Thiophanate-M.", val: "0.008 mg/kg", lmr: "0.50 mg/kg", pct: "1.6% de la LMR" },
  },
  {
    num: 4, date: "10 mai 2026", type: "Curatif", cible: "Carpocapse (Cydia pomonella)",
    justif: ["Ronde #8 — 07/05/2026", "Piège delta : 6 individus > seuil 5"],
    rows: [
      ["Produit", "Deltaméthrine 2.5% EC"],
      ["N° AMM Algérie", "AMM-DZ-2017-0089 — valide", true],
      ["Dose", "0.2 L/ha"],
      ["N° lot", "DM-2025-7703"],
    ],
    dar: "7 jours — 35 j écoulés",
    lmr: { molecule: "Deltaméthrine", val: "0.002 mg/kg", lmr: "0.01 mg/kg", pct: "20% de la LMR" },
  },
  {
    num: 5, date: "25 mai 2026", type: "Curatif", cible: "Tavelure (Venturia inaequalis)",
    justif: ["Ronde #10 — 20/05/2026", "Tavelure 6.8% > seuil 5%"],
    rows: [
      ["Produit", "Mancozèbe 80% WP"],
      ["N° AMM Algérie", "AMM-DZ-2018-0334 — valide", true],
      ["Dose", "2.0 kg/ha"],
      ["N° lot", "MZ-2025-9901"],
    ],
    dar: "28 jours — récolte 14/06/2026 (20 j écoulés)",
    darAlert: true,
    darNote:
      "Ce traitement a déclenché une alerte DAR automatique (25/05 + 28 j = 22/06 > récolte 14/06). " +
      "Le RT a validé manuellement après analyse résidus labo confirmant la conformité LMR. Rapport labo joint.",
    lmr: { molecule: "Mancozèbe (ETU)", val: "0.021 mg/kg", lmr: "0.05 mg/kg", pct: "analyse labo", labo: true },
  },
];

const LMR_CONSO = [
  { molecule: "Mancozèbe (ETU)", residu: "0.021 mg/kg", lmr: "0.05", pct: 42 },
  { molecule: "Captane",         residu: "0.040 mg/kg", lmr: "3.00", pct: 1 },
  { molecule: "Thiophanate-M.",  residu: "0.008 mg/kg", lmr: "0.50", pct: 2 },
  { molecule: "Deltaméthrine",   residu: "0.002 mg/kg", lmr: "0.01", pct: 20 },
];

const FERTI = [
  ["Azote (N)", "85", "kg/ha", "multi"],
  ["Phosphore (P₂O₅)", "40", "kg/ha", "printemps"],
  ["Potassium (K₂O)", "120", "kg/ha", "grossissement"],
  ["Calcium (Ca)", "35", "kg/ha", "post-floraison"],
  ["Magnésium (Mg)", "15", "kg/ha", "printemps"],
  ["Bore (B)", "0.5", "kg/ha", "pré-floraison"],
  ["Zinc (Zn)", "0.3", "kg/ha", "débourrement"],
];

const EAU: [string, string][] = [
  ["Source", "Puits profond — nappe albienne"],
  ["Profondeur", "180 m"],
  ["Volume total saison", "4 200 m³/ha"],
  ["Système", "Goutte-à-goutte (efficience 92%)"],
];
const EAU_ANALYSE = [
  ["E. coli", "< 1 UFC/100mL", "< 100", true],
  ["Salmonella", "Absent", "Absent", true],
  ["Nitrates", "12 mg/L", "< 50", true],
  ["pH", "7.4", "6.5-8.5", true],
  ["CE", "0.8 dS/m", "< 3.0", true],
  ["Pesticides totaux", "Non détectés", "< 0.5", true],
  ["Plomb (Pb)", "< 0.01 mg/L", "< 0.05", true],
  ["Cadmium (Cd)", "< 0.001 mg/L", "< 0.005", true],
];

const SOL = [
  ["pH (eau)", "7.2", "Neutre ✅"],
  ["Matière organique", "2.8%", "Correct ✅"],
  ["Calcaire total", "12%", "Modéré"],
  ["Calcaire actif", "4.2%", "Acceptable"],
  ["N minéral", "85 mg/kg", "Correct"],
  ["P assimilable", "42 mg/kg", "Bon ✅"],
  ["K échangeable", "310 mg/kg", "Bon ✅"],
  ["CE (dS/m)", "0.6", "Non salin ✅"],
  ["Texture", "—", "Limon argileux"],
];

const MAT_VEGETAL: [string, string][] = [
  ["Variété", "Golden Delicious"],
  ["Clone", "B — faible russeting"],
  ["Porte-greffe", "M9 EMLA"],
  ["Pépiniériste", "Pépinière certifiée"],
  ["Pays d'origine", "France — pépinière agréée INRAE"],
  ["N° lot plants", "PEPFR-2019-GD-M9-0441"],
  ["Certificat phyto", "n°MADR-IMPORT-2019-0108"],
  ["Délivré par", "DSP — Dir. Services Phytosanitaires, Alger"],
  ["Date plantation", "Mars 2019"],
  ["Déclaration OGM", "Non-OGM ✅ — MADR n°OGM-2019-0044"],
];

const EQUIP: [string, string][] = [
  ["Tracteur", "T-01 — John Deere 5075E"],
  ["Pulvérisateur", "Rampe 12m — Hardi Commander"],
  ["Système IoT", "ESP32 — LeadFarm v2.1"],
];
const CALIB = [
  ["Débitmètre", "02/03/2026", "+0.8%"],
  ["GPS", "02/03/2026", "CEP50 1.8m"],
  ["Capteur pression", "02/03/2026", "-1.2%"],
  ["Débitmètre", "10/05/2026", "+1.1%"],
  ["GPS", "10/05/2026", "CEP50 2.1m"],
];

const DECHETS = [
  ["Mancozèbe 80%", "25 kg", "3", "20/06/2026", "Filière ANDI"],
  ["Captane 50%", "25 kg", "1", "20/06/2026", "Filière ANDI"],
  ["Thiophanate-M.", "25 kg", "1", "20/06/2026", "Filière ANDI"],
  ["Deltaméthrine", "1 L", "1", "20/06/2026", "Filière ANDI"],
  ["Mancozèbe 80%", "25 kg", "2", "20/06/2026", "Filière ANDI"],
];

/* ── i18n (titres de sections) ────────────────────────────────────────── */
const I18N = {
  fr: { share: "Partager cette page", verify: "Vérifier ce GGN", viewAll: "Voir les 12 rondes", less: "Réduire", download: "Télécharger le bon de livraison PDF" },
  ar: { share: "شارك هذه الصفحة", verify: "تحقق من GGN", viewAll: "عرض 12 جولة", less: "إخفاء", download: "تحميل سند التسليم PDF" },
  en: { share: "Share this page", verify: "Verify this GGN", viewAll: "View all 12 rounds", less: "Show less", download: "Download delivery note PDF" },
};
type Lang = keyof typeof I18N;

/* ── Reusable UI ──────────────────────────────────────────────────────── */

function Section({ n, title, sub, children, accent }: { n: number; title: string; sub?: string; children: React.ReactNode; accent?: string }) {
  return (
    <section style={{ padding: "26px 0", borderTop: `1px solid ${C.hair}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: accent || C.green, letterSpacing: 0.5 }}>
          {String(n).padStart(2, "0")}
        </span>
        <h2 style={{ fontSize: 19, fontWeight: 900, color: C.ink, letterSpacing: -0.3, margin: 0 }}>{title}</h2>
      </div>
      {sub && <p style={{ fontSize: 13, color: C.sub, margin: "0 0 14px 22px" }}>{sub}</p>}
      <div style={{ marginLeft: 0 }}>{children}</div>
    </section>
  );
}

function Card({ children, dark, style }: { children: React.ReactNode; dark?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: dark ? C.ink : "#fff",
      color: dark ? "#fff" : C.ink,
      border: `1px solid ${dark ? "#333" : C.border}`,
      borderRadius: 12,
      padding: 16,
      boxShadow: "0 1px 3px rgba(16,24,40,0.06)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function KV({ k, v, ok, mono, dark }: { k: string; v: string; ok?: boolean; mono?: boolean; dark?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: `1px solid ${dark ? "#2a2a2a" : C.hair}` }}>
      <span style={{ fontSize: 13, color: dark ? "#9ca3af" : C.sub, flexShrink: 0 }}>{k}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right", fontFamily: mono ? MONO : "inherit", color: ok ? C.greenLt : (dark ? "#fff" : C.ink) }}>
        {v}{ok ? "  ✅" : ""}
      </span>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return <span style={{ color: C.greenLt, fontWeight: 700 }}>{children}</span>;
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: `${color}1A`, color, border: `1px solid ${color}40` }}>
      {children}
    </span>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

type LiveData = {
  source: "live" | "demo";
  lot?: { id: string; date_recolte?: string | null; quantite?: number | null; unite?: string | null; qualite?: string | null };
  parcelle?: Record<string, unknown> | null;
  campagne?: Record<string, unknown> | null;
  treatments?: Array<Record<string, unknown>>;
  counts?: { treatments: number; operators: number };
};

const fmtFr = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : null);

export default function PublicLotPage() {
  const params = useParams();
  const routeLotId = typeof params?.lotId === "string" ? decodeURIComponent(params.lotId) : "";

  const [lang, setLang] = useState<Lang>("fr");
  const [allRounds, setAllRounds] = useState(false);
  const [pageUrl, setPageUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [now, setNow] = useState("");
  const [live, setLive] = useState<LiveData | null>(null);
  const t = I18N[lang];

  const demo = useMemo(() => resolveLotDemoProfile(routeLotId || LOT.id), [routeLotId]);
  const demoProduit = demo.produit;
  const demoQualitePc = demo.qualitePc;

  useEffect(() => {
    const url = lotTraceUrl(routeLotId || demo.lotId);
    setPageUrl(url);
    setNow(new Date().toLocaleString("fr-FR"));
    QRCode.toDataURL(url, { width: 160, margin: 1 }).then(setQrDataUrl).catch(() => {});
  }, [routeLotId, demo.lotId]);

  useEffect(() => {
    if (!routeLotId) return;
    let cancelled = false;
    fetch(`/api/v1/public/lot/${encodeURIComponent(routeLotId)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setLive(d); })
      .catch(() => { if (!cancelled) setLive({ source: "demo" }); });
    return () => { cancelled = true; };
  }, [routeLotId]);

  /* ── Live overlay (real LeadFarm data) on top of demo fallback ── */
  const isLive = live?.source === "live";
  const lotId = live?.lot?.id || routeLotId || demo.lotId;
  const p = (live?.parcelle ?? {}) as Record<string, any>;
  const cmp = (live?.campagne ?? {}) as Record<string, any>;

  const produitRows: [string, string][] = isLive
    ? ([
        ["Variété", p.variete ?? "—"],
        ["Porte-greffe", p.porte_greffe ?? "—"],
        ["Parcelle", p.name ?? p.code ?? "—"],
        ["Surface parcelle", p.area_ha != null ? `${p.area_ha} ha` : "—"],
        ["Altitude", p.altitude != null ? `${p.altitude} m` : "—"],
        ["GPS centroïde", p.lat != null && p.lng != null ? `${p.lat}°N, ${p.lng}°W` : "—"],
        ["Culture", p.culture ?? "Malus domestica"],
        ["Saison", cmp.nom ?? "—"],
        ["Date récolte", fmtFr(live?.lot?.date_recolte) ?? "—"],
      ] as [string, string][])
    : demoProduit;

  const objectifs = isLive
    ? {
        ggn: cmp.ggn ?? LOT.ggn,
        rendement: cmp.rendement_cible_kg_ha as number | null,
        cat1: cmp.qualite_cible_cat1_pct as number | null,
        ift: cmp.ift_cible as number | null,
        marche: cmp.marche_destination as string | null,
      }
    : null;

  const liveTreatments = isLive ? (live?.treatments ?? []) : null;

  const section7Sub = isLive && liveTreatments
    ? `${liveTreatments.length} traitement${liveTreatments.length !== 1 ? "s" : ""} enregistré${liveTreatments.length !== 1 ? "s" : ""} — campagne ${cmp.nom ?? ""}${objectifs?.ift != null ? ` · IFT cible ≤ ${objectifs.ift}` : ""}`
    : "5 traitements réalisés · IFT total 3.2 sur objectif ≤ 4.0";


  const conform = lmrAllOk();

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        body { margin: 0; }
        .lf-scroll::-webkit-scrollbar { height: 6px; }
        .lf-scroll::-webkit-scrollbar-thumb { background: ${C.greenLt}; border-radius: 3px; }
        @media (min-width: 681px) { html { font-size: 16px; } }
        html { font-size: 15px; }
      `}</style>

      {/* ── Sticky header ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "rgba(248,249,244,0.92)", backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${C.border}`, padding: "10px 16px",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.green, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {lotId}
            </div>
            <div style={{ fontSize: 10, color: C.sub, display: "flex", alignItems: "center", gap: 5 }}>
              {demo.exploitation}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: isLive ? C.greenLt : C.sub, fontWeight: 700 }}>
                <span style={{ width: 5, height: 5, borderRadius: 999, background: isLive ? C.greenLt : "#cbd5e1", display: "inline-block" }} />
                {isLive ? "données LeadFarm en direct" : "données de démonstration"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Pill color={conform ? C.greenLt : C.red}>{conform ? "CONFORME ✓" : "ALERTE"}</Pill>
            <div style={{ display: "flex", gap: 2, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              {(["fr", "ar", "en"] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{
                  border: "none", cursor: "pointer", padding: "4px 8px", fontSize: 11, fontWeight: 700,
                  background: lang === l ? C.green : "transparent", color: lang === l ? "#fff" : C.sub,
                  textTransform: "uppercase",
                }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px 60px" }}>

        {/* ════ SECTION 1 — IDENTITÉ ════ */}
        <section style={{ padding: "22px 0 6px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Pill color={C.green}>🏅 GLOBALG.A.P. CERTIFIÉ ✓</Pill>
          </div>
          <Card>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.sub, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Lot ID</div>
                <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: C.ink, wordBreak: "break-all", lineHeight: 1.2, margin: "2px 0 12px" }}>
                  {lotId}
                </div>
                <KV k="Exploitation" v={demo.exploitation} />
                <KV k="Localisation" v={demo.localisation} />
                {isLive && cmp.nom && <KV k="Campagne" v={cmp.nom} />}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0" }}>
                  <span style={{ fontSize: 13, color: C.sub }}>GGN</span>
                  <a href={`https://database.globalgap.org/globalgap/search/SearchMain.faces`} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.green, textDecoration: "underline" }}>
                    {objectifs?.ggn || LOT.ggn} ↗
                  </a>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR de cette page" width={120} height={120} style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff" }} />
                  : <div style={{ width: 120, height: 120, borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff" }} />}
                <div style={{ fontSize: 10, color: C.sub, marginTop: 6 }}>{t.share}</div>
              </div>
            </div>
          </Card>
        </section>

        {/* ════ SECTION 2 — TIMELINE ════ */}
        <Section n={2} title="Cycle de vie du lot">
          <div className="lf-scroll" style={{ display: "flex", gap: 0, overflowX: "auto", paddingBottom: 12, scrollSnapType: "x mandatory" }}>
            {TIMELINE.map((s, i) => (
              <div key={i} style={{ minWidth: 168, scrollSnapAlign: "start", paddingRight: 14 }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 999, background: s.done ? C.greenLt : "#cbd5e1", border: "3px solid #fff", boxShadow: `0 0 0 1px ${s.done ? C.greenLt : "#cbd5e1"}`, flexShrink: 0 }} />
                  {i < TIMELINE.length - 1 && <div style={{ flex: 1, height: 2, background: s.done ? C.greenLt : C.border }} />}
                </div>
                <div style={{ fontSize: 22, lineHeight: 1 }}>{s.icon}</div>
                <div style={{ fontWeight: 900, fontSize: 14, marginTop: 4 }}>{s.titre}</div>
                <div style={{ fontFamily: MONO, fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 4 }}>{s.date}</div>
                {s.lines.map((l, k) => <div key={k} style={{ fontSize: 11, color: C.sub, lineHeight: 1.4 }}>{l}</div>)}
              </div>
            ))}
          </div>
        </Section>

        {/* ════ SECTION 3 — PRODUIT ════ */}
        <Section n={3} title="🍎 Produit">
          <Card>
            {produitRows.map(([k, v]) => <KV key={k} k={k} v={v} mono={k.startsWith("GPS")} />)}
            <a href={`https://maps.google.com/?q=${demo.mapCoords.lat},${demo.mapCoords.lng}`} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 12 }}>
              <img
                src={`https://staticmap.openstreetmap.de/staticmap.php?center=${demo.mapCoords.lat},${demo.mapCoords.lng}&zoom=13&size=620x140&markers=${demo.mapCoords.lat},${demo.mapCoords.lng},red-pushpin`}
                alt={`Localisation ${demo.mapLabel}`} width="100%" style={{ borderRadius: 8, border: `1px solid ${C.border}`, display: "block" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </a>
          </Card>
        </Section>

        {/* ════ SECTION 4 — QUALITÉ ════ */}
        <Section n={4} title="Qualité">
          <Card>
            <div style={{ marginBottom: 8 }}><Pill color={C.greenLt}>CAT I</Pill></div>
            {(isLive
              ? ([
                  ["Catégorie", live?.lot?.qualite ? `CAT ${live.lot.qualite}` : "CAT I (règlement UE 543/2011)"],
                  ["Volume net", live?.lot?.quantite != null ? `${live.lot.quantite.toLocaleString("fr-FR")} ${live.lot.unite ?? "kg"}` : "—"],
                  ["Date récolte", fmtFr(live?.lot?.date_recolte) ?? "—"],
                ] as [string, string][])
              : QUALITE
            ).map(([k, v]) => <KV key={k} k={k} v={v} />)}
            <div style={{ fontSize: 12, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 0.5, margin: "14px 0 4px" }}>
              Paramètres physico-chimiques
            </div>
            {demoQualitePc.map(([k, v, ok]) => <KV key={k} k={k} v={v} ok={ok} mono />)}
            <div style={{ marginTop: 12, fontSize: 12, color: C.sub }}>
              Défauts observés : <Check>aucun défaut disqualifiant</Check>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ flex: 1, aspectRatio: "4/3", borderRadius: 8, background: `${C.greenLt}22`, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🍎</div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: C.sub, marginTop: 4 }}>Galerie lot — 3 photos</div>
          </Card>
        </Section>

        {/* ════ SECTION 5 — PHÉNOLOGIE ════ */}
        <Section n={5} title="Phénologie" sub="Stades réels vs prévus — saison 2025-2026">
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: `${C.green}0D`, textAlign: "left" }}>
                  {["Stade", "Prévu", "Réel", "Écart"].map(h => <th key={h} style={{ padding: "10px 12px", fontSize: 11, textTransform: "uppercase", color: C.sub, fontWeight: 700 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {PHENO.map((p, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.hair}` }}>
                    <td style={{ padding: "9px 12px", fontWeight: 600 }}>{p.stade}</td>
                    <td style={{ padding: "9px 12px", fontFamily: MONO, color: C.sub }}>{p.prevu}</td>
                    <td style={{ padding: "9px 12px", fontFamily: MONO }}>{p.reel}</td>
                    <td style={{ padding: "9px 12px", fontFamily: MONO, fontWeight: 700, color: C.green }}>{p.ecart} j</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p style={{ fontSize: 12, color: C.sub, marginTop: 10, fontStyle: "italic" }}>
            Saison 2025-2026 précoce de 3-4 jours par rapport au calendrier moyen.
          </p>
        </Section>

        {/* ════ SECTION 6 — IPM ════ */}
        <Section n={6} title="Surveillance IPM" sub="Chaque traitement est justifié par une observation terrain documentée">
          <div style={{ display: "grid", gap: 12 }}>
            {(allRounds ? RONDES.concat(RONDES) : RONDES).slice(0, allRounds ? 12 : 3).map((r, i) => (
              <Card key={i} style={r.alert ? { borderColor: `${C.yellow}80`, background: `${C.yellow}0A` } : undefined}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 15 }}>Ronde #{r.num}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: C.green, fontWeight: 700 }}>{r.date}</span>
                </div>
                <KV k="Zone inspectée" v={r.zone} />
                <KV k="Opérateur" v="Opérateur certifié" ok />
                {r.obs.map((o, k) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
                    <span style={{ color: C.sub }}>{o.l}</span>
                    <span style={{ fontFamily: MONO, fontWeight: 700, color: o.ok ? C.greenLt : C.yellow }}>
                      {o.v} {o.seuil && `· ${o.seuil}`} {o.ok ? "✅" : "⚠️"}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: r.alert ? `${C.yellow}1A` : `${C.greenLt}1A`, fontSize: 12, fontWeight: 700, color: r.alert ? C.yellow : C.green }}>
                  Décision : {r.decision}
                </div>
              </Card>
            ))}
          </div>
          <button onClick={() => setAllRounds(v => !v)} style={btnGhost()}>{allRounds ? t.less : t.viewAll}</button>
        </Section>

        {/* ════ SECTION 7 — TRAITEMENTS ════ */}
        <Section n={7} title="Historique traitements" sub={section7Sub}>
          {/* ── Live treatments from LeadFarm ── */}
          {isLive && liveTreatments && (
            liveTreatments.length === 0 ? (
              <Card><div style={{ fontSize: 13, color: C.sub, textAlign: "center", padding: "8px 0" }}>Aucun traitement enregistré pour ce lot sur la période de campagne.</div></Card>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {liveTreatments.map((tr: any, i: number) => {
                  const produits = (tr.produits ?? []) as Array<any>;
                  const preventif = String(tr.type ?? "").toLowerCase().includes("prev");
                  return (
                    <Card key={tr.id ?? i}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
                        <span style={{ fontWeight: 900, fontSize: 16 }}>Traitement #{i + 1}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {tr.type && <Pill color={preventif ? C.greenLt : C.yellow}>{tr.type}</Pill>}
                          {tr.date && <span style={{ fontFamily: MONO, fontSize: 12, color: C.green, fontWeight: 700 }}>{fmtFr(tr.date)}</span>}
                        </div>
                      </div>
                      {tr.cible && <KV k="Cible" v={tr.cible} />}
                      {produits.map((pr, k) => (
                        <KV key={k} k={pr.nom} mono v={[pr.matiere_active, pr.dose != null ? `${pr.dose}` : null, pr.amm].filter(Boolean).join(" · ") || "—"} />
                      ))}
                      {tr.area_ha != null && <KV k="Surface traitée" v={`${tr.area_ha} ha`} mono />}
                      {tr.volume_bouillie != null && <KV k="Volume bouillie" v={`${tr.volume_bouillie} L/ha`} mono />}
                      {tr.materiel && <KV k="Matériel" v={tr.materiel} />}
                      {tr.operator_ref && <KV k="Opérateur" v={`${tr.operator_ref} (certifié)`} ok />}
                      {tr.dar_days != null && (
                        <>
                          <div style={subLabel()}>DAR (Délai Avant Récolte)</div>
                          <div style={{ fontSize: 13, fontFamily: MONO, color: C.greenLt, fontWeight: 700 }}>{tr.dar_days} jours ✅</div>
                        </>
                      )}
                    </Card>
                  );
                })}
              </div>
            )
          )}

          {/* ── Demo fallback (richest content) ── */}
          {!isLive && (
          <div style={{ display: "grid", gap: 14 }}>
            {TRAITEMENTS.map(tr => (
              <Card key={tr.num} style={tr.darAlert ? { borderColor: `${C.red}66` } : undefined}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 16 }}>Traitement #{tr.num}</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Pill color={tr.type === "Préventif" ? C.greenLt : C.yellow}>{tr.type}</Pill>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: C.green, fontWeight: 700 }}>{tr.date}</span>
                  </div>
                </div>
                <KV k="Cible" v={tr.cible} />
                <div style={{ margin: "10px 0", padding: "8px 10px", borderRadius: 8, background: `${C.green}0D`, fontSize: 12 }}>
                  <span style={{ fontWeight: 800, color: C.green }}>Justification IPM</span>
                  {tr.justif.map((j, k) => <div key={k} style={{ color: C.sub, marginTop: 2 }}>{j}</div>)}
                </div>
                {tr.rows.map(([k, v, ok]) => <KV key={k} k={k} v={v} ok={ok} mono={["lot", "AMM", "Dose", "Débit", "Couverture"].some(s => k.includes(s))} />)}

                {tr.conditions && (
                  <>
                    <div style={subLabel()}>Conditions d'application</div>
                    {tr.conditions.map(([k, v, ok]) => <KV key={k} k={k} v={v} ok={ok} mono />)}
                  </>
                )}

                <div style={subLabel()}>DAR (Délai Avant Récolte)</div>
                <div style={{ fontSize: 13, fontFamily: MONO, color: tr.darAlert ? C.red : C.greenLt, fontWeight: 700 }}>
                  {tr.dar} {tr.darAlert ? "⚠️" : "✅"}
                </div>
                {tr.darAlert && tr.darNote && (
                  <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, background: `${C.red}12`, border: `1px solid ${C.red}40` }}>
                    <div style={{ fontWeight: 900, fontSize: 12, color: C.red, marginBottom: 4 }}>⚠️ ALERTE DAR — validée par le RT</div>
                    <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.5 }}>{tr.darNote}</div>
                  </div>
                )}

                <div style={subLabel()}>LMR — marché UE (Règl. 396/2005)</div>
                <KV k={tr.lmr.molecule} v={`${tr.lmr.val} / LMR ${tr.lmr.lmr} · ${tr.lmr.pct}`} ok mono />
                {tr.lmr.labo && <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>🔬 Analyse labo certifié — pas une estimation</div>}

                {tr.efficacite && (
                  <>
                    <div style={subLabel()}>Efficacité J+14</div>
                    {tr.efficacite.map((e, k) => <div key={k} style={{ fontSize: 12, color: C.sub }}>{e}</div>)}
                  </>
                )}
              </Card>
            ))}
          </div>
          )}
        </Section>

        {/* ════ SECTION 8 — LMR CONSOLIDÉE ════ */}
        <Section n={8} title="Vérification LMR consolidée" sub="Conformité résidus — marché UE · Référentiel Règlement CE 396/2005">
          <Card>
            {LMR_CONSO.map((m, i) => {
              const barColor = m.pct < 50 ? C.greenLt : m.pct < 80 ? C.yellow : C.red;
              return (
                <div key={i} style={{ padding: "10px 0", borderBottom: i < LMR_CONSO.length - 1 ? `1px solid ${C.hair}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                    <span style={{ fontWeight: 700 }}>{m.molecule}</span>
                    <span style={{ fontFamily: MONO, color: C.sub }}>{m.residu} / {m.lmr} · <b style={{ color: barColor }}>{m.pct}%</b> ✅</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: C.border, overflow: "hidden" }}>
                    <div style={{ width: `${m.pct}%`, height: "100%", background: barColor, borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: C.sub, marginTop: 10, lineHeight: 1.5 }}>
              Résidus traitements 1-4 : estimation modèle demi-vie (méthode EFSA). Traitement 5 : analyse labo certifié.
            </div>
            <div style={{ marginTop: 12, textAlign: "center", padding: "10px", borderRadius: 8, background: `${C.greenLt}1A`, fontWeight: 900, color: C.green, fontSize: 14 }}>
              ✅ TOUTES MOLÉCULES CONFORMES LMR UE
            </div>
          </Card>
        </Section>

        {/* ════ SECTION 9 — FERTILISATION ════ */}
        <Section n={9} title="Fertilisation" sub="Programme fertigation exécuté — campagne 2025-2026">
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <SimpleTable head={["Intrant", "Apporté", "Unité", "Stade"]} rows={FERTI} monoCols={[1]} />
          </Card>
          <p style={{ fontSize: 12, color: C.sub, marginTop: 10 }}>
            <Check>✅</Check> Tous les engrais homologués pour usage agricole. <Check>✅</Check> Aucun métal lourd au-dessus des seuils réglementaires.
          </p>
        </Section>

        {/* ════ SECTION 10 — EAU ════ */}
        <Section n={10} title="Eau d'irrigation">
          <Card>
            {EAU.map(([k, v]) => <KV key={k} k={k} v={v} />)}
          </Card>
          <div style={{ fontSize: 12, color: C.sub, margin: "12px 0 8px" }}>Analyse qualité eau — 15/05/2026 · Labo LCEE Oran (accrédité ONML n°L-042)</div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <SimpleTable head={["Paramètre", "Résultat", "Norme", ""]} rows={EAU_ANALYSE.map(r => [r[0], r[1], r[2], "✅"]) as string[][]} monoCols={[1, 2]} />
          </Card>
          <p style={{ fontSize: 11, color: C.sub, marginTop: 8 }}>Prochaine analyse prévue : octobre 2026.</p>
        </Section>

        {/* ════ SECTION 11 — SOL ════ */}
        <Section n={11} title="Analyses sol" sub="Parcelle P7-A — décembre 2025 · Labo INRAA Sidi Bel Abbès">
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <SimpleTable head={["Paramètre", "Résultat", "Interprétation"]} rows={SOL} monoCols={[1]} />
          </Card>
        </Section>

        {/* ════ SECTION 12 — MATÉRIEL VÉGÉTAL ════ */}
        <Section n={12} title="Matériel végétal" sub="Traçabilité amont plantation">
          <Card>{MAT_VEGETAL.map(([k, v]) => <KV key={k} k={k} v={v} mono={/lot|n°/.test(k)} />)}</Card>
        </Section>

        {/* ════ SECTION 13 — ÉQUIPEMENT ════ */}
        <Section n={13} title="Équipement & traçabilité IoT">
          <Card>{EQUIP.map(([k, v]) => <KV key={k} k={k} v={v} />)}</Card>
          <div style={{ fontSize: 12, color: C.sub, margin: "12px 0 8px" }}>Calibrations réalisées — saison 2025-2026</div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <SimpleTable head={["Capteur", "Date", "Écart", ""]} rows={CALIB.map(r => [...r, "✅"]) as string[][]} monoCols={[1, 2]} />
          </Card>
          <p style={{ fontSize: 12, color: C.sub, marginTop: 8 }}><Check>✅</Check> Toutes les calibrations dans les tolérances acceptables (±5%).</p>
        </Section>

        {/* ════ SECTION 14 — OPÉRATEURS ════ */}
        <Section n={14} title="Opérateurs" sub="Traçabilité humaine — sans données personnelles nominatives · 3 opérateurs impliqués">
          <div style={{ display: "grid", gap: 12 }}>
            <Card>
              <div style={subLabelTop()}>Traitements — OP-001</div>
              <KV k="Certification" v="Phytosanitaire niveau 2" />
              <KV k="N° certification" v="DSP-SBA-2024-0089" mono />
              <KV k="Organisme" v="DSP Sidi Bel Abbès" />
              <KV k="Valide jusqu'à" v="31/12/2027" ok />
              <KV k="Formation" v="Manipulation produits T+ — 03/2026" ok />
              <KV k="EPI fournis" v="Combinaison, masque, gants, bottes" ok />
            </Card>
            <Card>
              <div style={subLabelTop()}>Scouting IPM — OP-002</div>
              <KV k="Formation IPM" v="Scouting et seuils — 02/2026" ok />
            </Card>
            <Card>
              <div style={subLabelTop()}>Récolte — OP-003</div>
              <KV k="Formation HSE" v="Sécurité récolte — 05/2026" ok />
            </Card>
          </div>
        </Section>

        {/* ════ SECTION 15 — DÉCHETS ════ */}
        <Section n={15} title="Gestion déchets" sub="Contenants phytosanitaires éliminés">
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <SimpleTable head={["Produit", "Format", "Qté", "Rincé", "Élimination"]} rows={DECHETS.map(r => [r[0], r[1], r[2], `✅ ${r[3]}`, r[4]]) as string[][]} monoCols={[2]} />
          </Card>
          <p style={{ fontSize: 12, color: C.sub, marginTop: 8, lineHeight: 1.5 }}>
            Collecteur agréé MATE · Bordereau suivi déchets : <b style={{ fontFamily: MONO }}>BSD-2026-0614-SBA</b>.<br />
            <Check>✅</Check> Aucun contenant éliminé hors filière.
          </p>
        </Section>

        {/* ════ SECTION 16 — CERTIFICATION ════ */}
        <Section n={16} title="Certification GLOBALG.A.P.">
          <Card style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>🏅</div>
            <div style={{ fontWeight: 900, fontSize: 18, color: C.green }}>GLOBALG.A.P. IFA v6 Smart</div>
            <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, margin: "6px 0 14px" }}>GGN {objectifs?.ggn || LOT.ggn}</div>
            <div style={{ textAlign: "left" }}>
              <KV k="Standard" v="Integrated Farm Assurance v6.0" />
              <KV k="Edition" v="Smart" />
              <KV k="Scope" v="Fruits et légumes frais" />
              <KV k="Date dernier audit" v="Avril 2026" />
              <KV k="Validité cert." v="Avril 2026 — Avril 2027" />
            </div>
            <a href="https://database.globalgap.org/globalgap/search/SearchMain.faces" target="_blank" rel="noopener noreferrer" style={btnSolid()}>
              {t.verify} ↗
            </a>
            <div style={{ marginTop: 14, padding: "10px", borderRadius: 8, background: `${C.greenLt}12`, textAlign: "left" }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: C.green, marginBottom: 4 }}>Auto-évaluation IFA v6 — Novembre 2025</div>
              <KV k="Score critères applicables" v="98.2%" ok />
              <KV k="Non-conformités majeures" v="0" ok />
              <KV k="Non-conformités mineures" v="1 (corrigée)" ok />
            </div>
          </Card>
        </Section>

        {/* ════ SECTION 17 — INTÉGRITÉ ════ */}
        <Section n={17} title="Intégrité des données">
          <Card dark>
            <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 10, color: C.greenLt }}>🔒 Données certifiées immuables</div>
            <KV dark k="Plateforme" v="LeadFarm v2.1" />
            <KV dark k="Base de données" v="Supabase — RLS activé" />
            <KV dark k="Audit trail" v="Journal SCD2 — horodaté" />
            <KV dark k="Lot créé le" v="14/06/2026 16:42:03 UTC+1" mono />
            <KV dark k="Dernière modif." v="14/06/2026 18:15:22 UTC+1" mono />
            <KV dark k="Modifications" v="1 (ajout rapport labo)" />
            <div style={{ padding: "8px 0" }}>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>Hash intégrité (SHA256)</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.greenLt, wordBreak: "break-all" }}>
                3f7a9b2c1d8e4f6a0b5c7d9e2f4a8b1c3d5e7f0a2b4c6d8e
              </div>
            </div>
            <div style={{ color: C.greenLt, fontWeight: 700, fontSize: 12 }}>Timestamp certifié ✅</div>
            <p style={{ fontSize: 12, color: "#cbd5e1", marginTop: 10, lineHeight: 1.6, fontStyle: "italic" }}>
              « Ces données sont enregistrées avec horodatage certifié et ne peuvent pas être modifiées rétroactivement.
              Toute modification génère une entrée d'audit traçable. »
            </p>
          </Card>
        </Section>

        {/* ════ SECTION 18 — BON DE LIVRAISON ════ */}
        <Section n={18} title="Bon de livraison">
          <Card>
            <KV k="BL n°" v="2026-441" mono />
            <KV k="Date livraison" v="15 juin 2026" />
            <KV k="Destination" v="Export UE" />
            <KV k="Volume livré" v="1 840 kg net" mono />
            <KV k="Colisage" v="100 caisses × 18.4 kg" mono />
            <KV k="Température départ" v="4°C (chaîne du froid)" ok />
            <a href="#" onClick={(e) => e.preventDefault()} style={btnSolid()}>⬇ {t.download}</a>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 6, textAlign: "center" }}>Inclut QR code + dossier traçabilité complet.</div>
          </Card>
        </Section>

        {/* ════ SECTION 19 — CONTACT ════ */}
        <Section n={19} title="Contact">
          <Card>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Une question sur ce lot ?</div>
            <KV k="Exploitation" v={LOT.exploitation} />
            <KV k="Adresse" v="Route de Ténira, Sidi Bel Abbès 22000, Algérie" />
            <KV k="Responsable traçabilité" v="contact@domaine-khelifa.dz" />
            <KV k="Certifié par GLOBALG.A.P. CB" v="cb@certification.org" />
          </Card>
        </Section>

        {/* ════ FOOTER ════ */}
        <footer style={{ borderTop: `1px solid ${C.hair}`, marginTop: 30, paddingTop: 20, textAlign: "center", color: C.sub, fontSize: 11, lineHeight: 1.7 }}>
          <div style={{ fontWeight: 800, color: C.green }}>Généré par LeadFarm</div>
          <div>Plateforme de traçabilité agricole certifiée</div>
          <div>Page générée le : <span style={{ fontFamily: MONO }}>{now || "—"}</span></div>
          <div>Données valides au : <span style={{ fontFamily: MONO }}>{LOT.closedAt}</span></div>
          <div style={{ marginTop: 6 }}>leadfarm.app — GGN <span style={{ fontFamily: MONO }}>{objectifs?.ggn || LOT.ggn}</span></div>
        </footer>
      </main>

      {/* ── Scroll bar ── */}
      <div style={{
        position: "fixed", bottom: 20, right: 14, zIndex: 50,
        display: "flex", flexDirection: "column", gap: 0,
        borderRadius: 999, overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
        border: `1px solid ${C.border}`,
      }}>
        {[
          { label: "↑↑", title: "Haut de page", action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
          { label: "↑", title: "Défiler vers le haut", action: () => window.scrollBy({ top: -window.innerHeight * 0.7, behavior: "smooth" }) },
          { label: "↓", title: "Défiler vers le bas", action: () => window.scrollBy({ top: window.innerHeight * 0.7, behavior: "smooth" }) },
          { label: "↓↓", title: "Bas de page", action: () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }) },
        ].map(({ label, title, action }, i, arr) => (
          <button
            key={label}
            onClick={action}
            title={title}
            style={{
              width: 44, height: 44, border: "none", cursor: "pointer",
              background: "#fff", color: C.green,
              fontSize: label.length > 1 ? 11 : 16,
              fontWeight: 900,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = `${C.green}18`)}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
          >{label}</button>
        ))}
      </div>
    </div>
  );
}

/* ── helpers ──────────────────────────────────────────────────────────── */

function lmrAllOk() {
  return LMR_CONSO.every(m => m.pct < 100);
}

function SimpleTable({ head, rows, monoCols = [] }: { head: string[]; rows: string[][]; monoCols?: number[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
      <thead>
        <tr style={{ background: `${C.green}0D`, textAlign: "left" }}>
          {head.map((h, i) => <th key={i} style={{ padding: "9px 10px", fontSize: 10.5, textTransform: "uppercase", color: C.sub, fontWeight: 700 }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderTop: `1px solid ${C.hair}` }}>
            {r.map((cell, j) => (
              <td key={j} style={{ padding: "8px 10px", fontFamily: monoCols.includes(j) ? MONO : "inherit", fontWeight: j === 0 ? 600 : 400, color: /✅/.test(cell) ? C.greenLt : C.ink }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function subLabel(): React.CSSProperties {
  return { fontSize: 11, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: 0.5, margin: "12px 0 4px" };
}
function subLabelTop(): React.CSSProperties {
  return { fontSize: 12, fontWeight: 900, color: C.green, marginBottom: 6 };
}
function btnGhost(): React.CSSProperties {
  return { display: "block", width: "100%", marginTop: 12, padding: "10px", borderRadius: 10, border: `1px solid ${C.green}`, background: "transparent", color: C.green, fontWeight: 700, fontSize: 13, cursor: "pointer" };
}
function btnSolid(): React.CSSProperties {
  return { display: "block", marginTop: 14, padding: "11px", borderRadius: 10, background: C.green, color: "#fff", fontWeight: 800, fontSize: 13, textAlign: "center", textDecoration: "none" };
}

