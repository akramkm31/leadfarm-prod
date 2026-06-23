/** Public lot traceability — demo profiles (no auth, fallback when DB miss). */

export const NORD_A_GOLDEN_LOT_ID = "DK-2026-NORDA-20260614";
export const P7A_LEGACY_LOT_ID = "DK-2026-P7A-20260614";

export type LotDemoProfile = {
  lotId: string;
  exploitation: string;
  localisation: string;
  ggn: string;
  produit: [string, string][];
  qualitePc: [string, string, boolean?][];
  mapLabel: string;
  mapCoords: { lat: number; lng: number };
};

const NORD_A_GOLDEN: LotDemoProfile = {
  lotId: NORD_A_GOLDEN_LOT_ID,
  exploitation: "Domaine Khelifa — Groupe Lechehab",
  localisation: "Tenira, Sidi Bel Abbès, Algérie (wilaya 22)",
  ggn: "4049928123456",
  produit: [
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
  ],
  qualitePc: [
    ["Brix", "13.2° (min CAT I : 11°)", true],
    ["Firmété", "7.1 kg/cm² (pénétromètre)"],
    ["Acidité titrable", "5.8 g/L ac. malique"],
    ["Poids moyen fruit", "198 g"],
    ["Couleur", "Jaune doré uniforme (> 85 % surface)", true],
  ],
  mapLabel: "Nord-A — Golden Delicious",
  mapCoords: { lat: 35.1234, lng: -0.5678 },
};

const NORD_A_ALIASES = /^(DK-2026-NORDA|NORD-A|NORDA|GOLDEN)/i;

export function resolveLotDemoProfile(routeLotId: string): LotDemoProfile {
  const id = routeLotId.trim();
  if (
    !id ||
    id === NORD_A_GOLDEN_LOT_ID ||
    id === P7A_LEGACY_LOT_ID ||
    NORD_A_ALIASES.test(id) ||
    /golden|nord.?a/i.test(id)
  ) {
    return { ...NORD_A_GOLDEN, lotId: id || NORD_A_GOLDEN_LOT_ID };
  }
  return { ...NORD_A_GOLDEN, lotId: id };
}

export function lotTraceUrl(lotId: string, baseUrl?: string): string {
  const base =
    baseUrl?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/lot/${encodeURIComponent(lotId)}`;
}
