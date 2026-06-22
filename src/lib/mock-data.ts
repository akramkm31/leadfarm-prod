// =============================================================
// LeadFarm — Gestion de Stock Phytosanitaire + Parcelles + Traitements
// Professional Agricultural Management System
// =============================================================

export interface Exploitation {
  id: string;
  name: string;
  registrationNumber: string;
  wilaya: string;
  commune: string;
  site: string;
  subscriptionPlan: "starter" | "pro" | "enterprise";
}

// --- STOCK MANAGEMENT ---

export interface Supplier {
  id: string;
  name: string;
  type: "distributeur" | "fournisseur" | "fabricant";
  phone: string;
  email?: string;
  address?: string;
  city: string;
  wilaya: string;
  registrationNumber?: string;
  totalDeliveries: number;
  totalValueDZD: number;
  lastDeliveryDate: string | null;
  active: boolean;
}

export type ProductCategory = "fongicide" | "herbicide" | "insecticide" | "engrais" | "adjuvant" | "semence" | "acaricide" | "acide" | "acide_phosphorique" | "acide_nitrique" | "acide_sulfurique" | "acide_humique" | "matiere_organique" | "fer" | "dormance" | "hormone" | "drmx" | "autre";

export type Formulation = "EC" | "SC" | "WP" | "WG" | "SL" | "EW" | "CS" | "SE" | "OD" | "GR" | "FS" | "autre";

export interface ActiveIngredient {
  name: string;
  concentration: number;
  unit: "g/L" | "g/kg" | "%" | "mL/L";
}

export interface PhytoProduct {
  id: string;
  name: string;
  tradeName: string;
  registrationNumber: string;
  activeSubstance: string;
  composition: ActiveIngredient[];
  teneurMA: number;
  teneurMAUnit: "g/L" | "g/kg" | "%";
  category: ProductCategory;
  familleChimique: string;
  formulation: Formulation;
  cible: string[];
  dosePerHectareDefault: number;
  dosePerHectareMin: number;
  dosePerHectareMax: number;
  dosePerTree?: number;
  doseUnit: "L/ha" | "kg/ha" | "cL/ha" | "g/ha" | "mL/arbre" | "g/arbre";
  unit: string;
  priceDZD: number;
  supplierId: string;
  supplierName: string;
  expiryDate: string;
  stockInitial: number;
  stockInitialDate: string;
  dar: number;
  reentryDelay: number;
  toxicityClass: "I" | "II" | "III" | "IV";
  pictograms: string[];
  notes?: string;
}

export type StockMovementCategory =
  | "entree_fournisseur"
  | "entree_distributeur"
  | "retour_parcelle"
  | "sortie_traitement"
  | "sortie_interne"
  | "transfert_externe"
  | "ajustement_inventaire"
  | "perte_peremption";

export interface StockEntry {
  id: string;
  productId: string;
  productName: string;
  type: "entry" | "exit" | "adjustment" | "treatment_consumption" | "transfer" | "return" | "stock_initial";
  movementType?: string;
  movementCategory: StockMovementCategory;
  category?: string;
  quantity: number;
  unit: string;
  date: string;
  reference?: string;
  lotNumber?: string;
  supplierId?: string | null;
  supplierName?: string;
  distributorId?: string | null;
  treatmentId?: string;
  culture?: string;
  siteId?: string;
  siteName?: string;
  detailsSite?: string;
  observations?: string;
  transferDestination?: string;
  transferDestinationWilaya?: string;
  transferDestinationSite?: string;
  returnFromParcelleId?: string;
  returnFromParcelleName?: string;
  notes?: string;
  unitPriceDZD?: number;
  validatedBy?: string;
  stockInitial?: number | null;
  nUnits?: number | null;
  pUnits?: number | null;
  kUnits?: number | null;
  caUnits?: number | null;
  zincUnits?: number | null;
}

export interface StockLevel {
  productId: string;
  productName: string;
  category: ProductCategory;
  currentQuantity: number;
  unit: string;
  minThreshold: number;
  maxCapacity: number;
  lastEntryDate: string;
  lastExitDate: string | null;
  totalValueDZD: number;
  avgUnitPriceDZD: number;
  status: "ok" | "low" | "critical" | "overstock";
  expiryDate: string;
  lotNumber?: string;
  stockInitial: number;
}

// --- HIERARCHICAL PARCELS ---

export type CultureType = "arboriculture" | "cereales" | "viticulture" | "maraichage" | "oleiculture" | "agrumes" | "autre";

export interface Parcelle {
  id: string;
  name: string;
  parentId: string | null;
  exploitationId: string;
  areaHectares: number;
  cropType: string;
  variete: string;
  cultureType: CultureType;
  soilType: string;
  site: string;
  zone: string;
  secteur: string;
  altitude?: number;
  irrigation: "goutte_a_goutte" | "aspersion" | "gravitaire" | "pluvial" | "aucune";
  densitePlantation?: number;
  densiteUnit?: "arbres/ha" | "pieds/ha" | "plants/ha";
  dateImplantation?: string;
  observations?: string;
  center: [number, number];
  boundary: [number, number][];
  color: string;
  children?: Parcelle[];
  lastTreatmentDate: string | null;
  treatmentCount: number;
}

// --- TREATMENTS ---

export type TreatmentStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "planned"
  | "in_progress"
  | "completed"
  | "evaluated"
  | "cancelled";

export interface TreatmentProduct {
  productId: string;
  productName: string;
  quantityUsed: number;
  unit: string;
  dosePerHectare: number;
  dosePerTree?: number;
  stockEntryId?: string;
}

export interface Treatment {
  id: string;
  parcelleId: string;
  parcelleName: string;
  sousParcelleId?: string;
  sousParcelleName?: string;
  operatorId: string;
  operatorName: string;
  status: TreatmentStatus;
  type: "pulverisation" | "fertilisation" | "desherbage" | "traitement_semence" | "autre";
  products: TreatmentProduct[];
  plannedDate: string;
  executedDate: string | null;
  completedDate: string | null;
  areaTreatedHectares: number;
  treesCount?: number;
  weatherConditions?: string;
  windSpeed?: number;
  temperature?: number;
  humidity?: number;
  notes?: string;
  totalCostDZD: number;
  gpsTrack?: [number, number][];
  volumeBouillie?: number;
  volumeBouillieUnit?: "L" | "L/ha";
}

export interface Operator {
  id: string;
  fullName: string;
  identifierCode: string;
  phone?: string;
  role: "operator" | "technician" | "agronomist";
  certificationNumber?: string;
  active: boolean;
  totalTreatments: number;
  lastTreatmentDate: string | null;
}

export interface Alert {
  id: string;
  type: "low_stock" | "critical_stock" | "treatment_overdue" | "parcel_untreated" | "stock_expiry" | "device_offline" | "dar_violation" | "transfer_pending";
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: string;
  acknowledged: boolean;
  relatedId?: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  totalParcelles: number;
  totalAreaHectares: number;
  activeTreatments: number;
  completedTreatments: number;
  treatmentsThisMonth: number;
  treatmentsTrend: number;
  operatorsActive: number;
  alertsCount: number;
  avgCostPerHectare: number;
  totalTransfers: number;
  productsExpiringSoon: number;
}

// --- FERTILIZER CALCULATION ---

export interface FertilizerUnit {
  productId: string;
  productName: string;
  parcelleId: string;
  parcelleName: string;
  areaHectares: number;
  nitrogenN: number;
  phosphorusP2O5: number;
  potassiumK2O: number;
  doseApplied: number;
  unit: string;
  unitsN: number;
  unitsP: number;
  unitsK: number;
  date: string;
}

// =============================================================
// MOCK DATA
// =============================================================

export const currentExploitation: Exploitation = {
  id: "exp-001",
  name: "Exploitation Les Frères Lacheb",
  registrationNumber: "DZ-22-AG-2024-0322",
  wilaya: "Sidi Bel Abbès",
  commune: "Tenira",
  site: "Domaine SBA — Tenira",
  subscriptionPlan: "enterprise",
};

export const suppliers: Supplier[] = [
  { id: "sup-001", name: "BLIDA", type: "distributeur", phone: "+213 25 43 00 00", email: "contact@blida-agro.dz", city: "Blida", wilaya: "Blida", registrationNumber: "RC-09-2018-B0039", totalDeliveries: 39, totalValueDZD: 4200000, lastDeliveryDate: "2026-05-10", active: true },
  { id: "sup-002", name: "DEVAGRI", type: "distributeur", phone: "+213 48 74 00 00", email: "devagri@devagri.dz", city: "Sidi Bel Abbès", wilaya: "Sidi Bel Abbès", registrationNumber: "RC-22-2016-A0188", totalDeliveries: 13, totalValueDZD: 1850000, lastDeliveryDate: "2026-04-22", active: true },
  { id: "sup-003", name: "SRID", type: "distributeur", phone: "+213 46 90 00 00", email: "srid@srid-agro.dz", city: "Relizane", wilaya: "Relizane", registrationNumber: "RC-48-2017-C0211", totalDeliveries: 11, totalValueDZD: 980000, lastDeliveryDate: "2026-03-15", active: true },
  { id: "sup-004", name: "MAHALIA", type: "distributeur", phone: "+213 48 76 00 00", email: "mahalia@mahalia-agri.dz", city: "Sidi Bel Abbès", wilaya: "Sidi Bel Abbès", registrationNumber: "RC-22-2019-D0097", totalDeliveries: 10, totalValueDZD: 1120000, lastDeliveryDate: "2026-04-30", active: true },
  { id: "sup-005", name: "BIGAGRI", type: "distributeur", phone: "+213 48 80 00 00", email: "contact@bigagri.dz", city: "Sidi Bel Abbès", wilaya: "Sidi Bel Abbès", registrationNumber: "RC-22-2020-E0144", totalDeliveries: 5, totalValueDZD: 620000, lastDeliveryDate: "2026-03-28", active: true },
  { id: "sup-006", name: "SOMEDIA", type: "distributeur", phone: "+213 45 26 00 00", email: "somedia@somedia.dz", city: "Mostaganem", wilaya: "Mostaganem", registrationNumber: "RC-27-2015-F0076", totalDeliveries: 8, totalValueDZD: 730000, lastDeliveryDate: "2026-04-05", active: true },
  { id: "sup-007", name: "CASAP", type: "fournisseur", phone: "+213 21 63 00 00", email: "casap@casap.dz", city: "Alger", wilaya: "Alger", registrationNumber: "RC-16-2010-G0012", totalDeliveries: 9, totalValueDZD: 3800000, lastDeliveryDate: "2026-05-15", active: true },
  { id: "sup-008", name: "HYGINDUST", type: "fournisseur", phone: "+213 21 55 00 00", email: "hygindust@hygindust.dz", city: "Alger", wilaya: "Alger", registrationNumber: "RC-16-2008-H0005", totalDeliveries: 5, totalValueDZD: 2100000, lastDeliveryDate: "2026-04-18", active: true },
  { id: "sup-009", name: "AGROTODAY", type: "distributeur", phone: "+213 48 72 00 00", email: "info@agrotoday.dz", city: "Sidi Bel Abbès", wilaya: "Sidi Bel Abbès", registrationNumber: "RC-22-2021-I0203", totalDeliveries: 4, totalValueDZD: 480000, lastDeliveryDate: "2026-03-20", active: true },
];

export const products: PhytoProduct[] = [
  // 1 — BELLIS (SDHI + Strobilurine, tavelure/oïdium pommier)
  {
    id: "prod-001", name: "BELLIS", tradeName: "BELLIS",
    registrationNumber: "PHY-DZ-2022-B01",
    activeSubstance: "Boscalid 252 g/kg + Pyraclostrobine 128 g/kg",
    composition: [
      { name: "Boscalid", concentration: 252, unit: "g/kg" },
      { name: "Pyraclostrobine", concentration: 128, unit: "g/kg" },
    ],
    teneurMA: 380, teneurMAUnit: "g/kg",
    category: "fongicide", familleChimique: "SDHI + Strobilurine",
    formulation: "WG",
    cible: ["Tavelure", "Oïdium", "Moniliose", "Pourriture grise"],
    dosePerHectareDefault: 0.8, dosePerHectareMin: 0.6, dosePerHectareMax: 1.2,
    dosePerTree: 4, doseUnit: "kg/ha", unit: "kg",
    priceDZD: 8500, supplierId: "sup-002", supplierName: "DEVAGRI",
    expiryDate: "2028-03-01", stockInitial: 960, stockInitialDate: "2026-03-01",
    dar: 7, reentryDelay: 24, toxicityClass: "IV", pictograms: ["GHS07", "GHS09"],
  },
  // 2 — BOUILLIE BORDELAISE (cuivre, bactériose/mildiou pommier)
  {
    id: "prod-002", name: "BOUILLIE BORDELAISE", tradeName: "BOUILLIE BORDELAISE",
    registrationNumber: "PHY-DZ-2020-BB01",
    activeSubstance: "Cuivre (hydroxyde de cuivre) 190 g/L",
    composition: [{ name: "Cuivre métal", concentration: 190, unit: "g/L" }],
    teneurMA: 190, teneurMAUnit: "g/L",
    category: "fongicide", familleChimique: "Cuivriques inorganiques",
    formulation: "SC",
    cible: ["Tavelure", "Mildiou", "Bactériose", "Chancre bactérien"],
    dosePerHectareDefault: 3.0, dosePerHectareMin: 2.0, dosePerHectareMax: 4.0,
    dosePerTree: 15, doseUnit: "L/ha", unit: "kg",
    priceDZD: 1200, supplierId: "sup-001", supplierName: "BLIDA",
    expiryDate: "2027-12-01", stockInitial: 500, stockInitialDate: "2026-01-01",
    dar: 14, reentryDelay: 24, toxicityClass: "IV", pictograms: ["GHS07"],
  },
  // 3 — CORAGEN (diamide, carpocapse)
  {
    id: "prod-003", name: "CORAGEN", tradeName: "CORAGEN",
    registrationNumber: "PHY-DZ-2021-CO01",
    activeSubstance: "Cyantraniliprole 200 g/l",
    composition: [{ name: "Cyantraniliprole", concentration: 200, unit: "g/L" }],
    teneurMA: 200, teneurMAUnit: "g/L",
    category: "insecticide", familleChimique: "Diamides anthranilamiques",
    formulation: "SE",
    cible: ["Carpocapse", "Tordeuses", "Mouche des fruits"],
    dosePerHectareDefault: 0.175, dosePerHectareMin: 0.125, dosePerHectareMax: 0.25,
    dosePerTree: 1, doseUnit: "L/ha", unit: "L",
    priceDZD: 45000, supplierId: "sup-003", supplierName: "SRID",
    expiryDate: "2027-06-01", stockInitial: 12, stockInitialDate: "2026-06-01",
    dar: 7, reentryDelay: 24, toxicityClass: "III", pictograms: ["GHS07", "GHS09"],
  },
  // 4 — AGROIL BLUE (huile blanche, acariens/cochenilles)
  {
    id: "prod-004", name: "AGROIL BLUE", tradeName: "AGROIL BLUE",
    registrationNumber: "PHY-DZ-2020-AO01",
    activeSubstance: "Huile de paraffine 83%",
    composition: [{ name: "Huile minérale de paraffine", concentration: 83, unit: "%" }],
    teneurMA: 83, teneurMAUnit: "%",
    category: "insecticide", familleChimique: "Huile minérale",
    formulation: "EC",
    cible: ["Cochenilles", "Acariens", "Pucerons", "Psylle"],
    dosePerHectareDefault: 10.0, dosePerHectareMin: 6.0, dosePerHectareMax: 15.0,
    dosePerTree: 50, doseUnit: "L/ha", unit: "L",
    priceDZD: 1800, supplierId: "sup-005", supplierName: "BIGAGRI",
    expiryDate: "2028-01-01", stockInitial: 300, stockInitialDate: "2026-01-01",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
  // 5 — LAIT DE CHAUX (dormance hivernale, protection troncs)
  {
    id: "prod-005", name: "LAIT DE CHAUX", tradeName: "LAIT DE CHAUX",
    registrationNumber: "PHY-DZ-2019-LC01",
    activeSubstance: "Hydroxyde de calcium Ca(OH)2",
    composition: [{ name: "Hydroxyde de calcium", concentration: 95, unit: "%" }],
    teneurMA: 95, teneurMAUnit: "%",
    category: "dormance", familleChimique: "Inorganique calcium",
    formulation: "WP",
    cible: ["Bactériose", "Chancre", "Protection tronc hivernale"],
    dosePerHectareDefault: 30.0, dosePerHectareMin: 20.0, dosePerHectareMax: 50.0,
    dosePerTree: 150, doseUnit: "kg/ha", unit: "kg",
    priceDZD: 200, supplierId: "sup-001", supplierName: "BLIDA",
    expiryDate: "2027-12-31", stockInitial: 2650, stockInitialDate: "2026-01-15",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
  // 6 — ACIDE PHOSPHORIQUE (AP — acidification irrigation + nutrition P)
  {
    id: "prod-006", name: "ACIDE PHOSPHORIQUE", tradeName: "ACIDE PHOSPHORIQUE",
    registrationNumber: "PHY-DZ-2018-AP01",
    activeSubstance: "Acide phosphorique H₃PO₄ 75%",
    composition: [{ name: "H₃PO₄", concentration: 75, unit: "%" }],
    teneurMA: 75, teneurMAUnit: "%",
    category: "acide_phosphorique", familleChimique: "Acide minéral",
    formulation: "SL",
    cible: ["Acidification eau irrigation", "Nutrition phosphore", "Débouchage goutteurs"],
    dosePerHectareDefault: 2.0, dosePerHectareMin: 1.0, dosePerHectareMax: 4.0,
    doseUnit: "L/ha", unit: "L",
    priceDZD: 1500, supplierId: "sup-008", supplierName: "HYGINDUST",
    expiryDate: "2028-02-28", stockInitial: 2850, stockInitialDate: "2026-02-28",
    dar: 0, reentryDelay: 0, toxicityClass: "III", pictograms: ["GHS05"],
  },
  // 7 — Agrizote = ACIDE NITRIQUE (AN — acidification + apport N fertigation)
  {
    id: "prod-007", name: "Agrizote", tradeName: "Agrizote (Acide Nitrique 55%)",
    registrationNumber: "PHY-DZ-2019-AN01",
    activeSubstance: "Acide Nitrique HNO₃ 55%",
    composition: [{ name: "HNO₃", concentration: 55, unit: "%" }],
    teneurMA: 55, teneurMAUnit: "%",
    category: "acide_nitrique", familleChimique: "Acide minéral oxydant",
    formulation: "SL",
    cible: ["Acidification eau irrigation", "Nutrition azote (N)", "Nettoyage réseau goutte-à-goutte"],
    dosePerHectareDefault: 0.01, dosePerHectareMin: 0.005, dosePerHectareMax: 0.02,
    doseUnit: "L/ha", unit: "L",
    priceDZD: 800, supplierId: "sup-007", supplierName: "CASAP",
    expiryDate: "2027-12-31", stockInitial: 2900, stockInitialDate: "2026-06-11",
    dar: 0, reentryDelay: 0, toxicityClass: "II", pictograms: ["GHS03", "GHS05"],
  },
  // 8 — GREEN ZINC (GZ — zinc chélaté, fertirrigation)
  {
    id: "prod-008", name: "GREEN ZINC", tradeName: "GREEN ZINC",
    registrationNumber: "PHY-DZ-2020-GZ01",
    activeSubstance: "Zinc chélaté (Zn-EDTA) 15%",
    composition: [{ name: "Zinc (Zn)", concentration: 15, unit: "%" }],
    teneurMA: 15, teneurMAUnit: "%",
    category: "engrais", familleChimique: "Oligo-élément chélaté Zn",
    formulation: "SL",
    cible: ["Carence zinc", "Nutrition racinaire", "Nouaison pommier"],
    dosePerHectareDefault: 2.5, dosePerHectareMin: 1.5, dosePerHectareMax: 4.0,
    doseUnit: "L/ha", unit: "L",
    priceDZD: 3500, supplierId: "sup-006", supplierName: "SOMEDIA",
    expiryDate: "2028-06-01", stockInitial: 200, stockInitialDate: "2026-01-01",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
  // 9 — BLACK JAK (Blackjak — acide humique, fertirrigation BJ)
  {
    id: "prod-009", name: "BLACK JAK", tradeName: "BLACK JAK",
    registrationNumber: "PHY-DZ-2021-BJ01",
    activeSubstance: "Acide humique 12% + Acide fulvique 5%",
    composition: [
      { name: "Acide humique", concentration: 12, unit: "%" },
      { name: "Acide fulvique", concentration: 5, unit: "%" },
    ],
    teneurMA: 17, teneurMAUnit: "%",
    category: "acide_humique", familleChimique: "Matières humiques",
    formulation: "SL",
    cible: ["Amélioration structure sol", "Nutrition racinaire", "Biostimulation"],
    dosePerHectareDefault: 1.5, dosePerHectareMin: 1.0, dosePerHectareMax: 2.5,
    doseUnit: "L/ha", unit: "L",
    priceDZD: 2800, supplierId: "sup-005", supplierName: "BIGAGRI",
    expiryDate: "2028-01-01", stockInitial: 350, stockInitialDate: "2026-01-01",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
  // 10 — FERTIGEL 00.52.34 (PK hydrosoluble, floraison/grossissement)
  {
    id: "prod-010", name: "FERTIGEL 00.52.34", tradeName: "FERTIGEL 00.52.34",
    registrationNumber: "PHY-DZ-2020-FG01",
    activeSubstance: "Phosphore 52% P₂O₅ + Potassium 34% K₂O",
    composition: [
      { name: "Phosphore (P₂O₅)", concentration: 52, unit: "%" },
      { name: "Potassium (K₂O)", concentration: 34, unit: "%" },
    ],
    teneurMA: 86, teneurMAUnit: "%",
    category: "engrais", familleChimique: "Engrais PK hydrosoluble",
    formulation: "SL",
    cible: ["Nutrition phosphore/potassium", "Stimulation floraison", "Grossissement fruit"],
    dosePerHectareDefault: 3.0, dosePerHectareMin: 2.0, dosePerHectareMax: 5.0,
    doseUnit: "L/ha", unit: "L",
    priceDZD: 4200, supplierId: "sup-009", supplierName: "AGROTODAY",
    expiryDate: "2028-06-01", stockInitial: 500, stockInitialDate: "2026-01-01",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
  // 11 — Nitrate calcium (NC — Ca+N fertirrigation, prévention bitter pit)
  {
    id: "prod-011", name: "Nitrate calcium", tradeName: "Nitrate calcium",
    registrationNumber: "PHY-DZ-2018-NC01",
    activeSubstance: "Ca(NO₃)₂ — 15,5N + 26 CaO",
    composition: [
      { name: "Azote (N) nitrique", concentration: 15.5, unit: "%" },
      { name: "Oxyde de calcium (CaO)", concentration: 26, unit: "%" },
    ],
    teneurMA: 41.5, teneurMAUnit: "%",
    category: "engrais", familleChimique: "Nitrate double Ca-N",
    formulation: "GR",
    cible: ["Nutrition calcium/azote", "Prévention bitter pit", "Qualité fruit"],
    dosePerHectareDefault: 17.0, dosePerHectareMin: 10.0, dosePerHectareMax: 25.0,
    dosePerTree: 85, doseUnit: "kg/ha", unit: "qx",
    priceDZD: 4500, supplierId: "sup-007", supplierName: "CASAP",
    expiryDate: "2026-08-01", stockInitial: 504, stockInitialDate: "2026-01-20",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
  // 12 — Nitrate potassium (NK — K+N fertirrigation, qualité couleur)
  {
    id: "prod-012", name: "Nitrate potassium", tradeName: "Nitrate potassium",
    registrationNumber: "PHY-DZ-2018-NK01",
    activeSubstance: "KNO₃ — 13N + 44 K₂O",
    composition: [
      { name: "Azote (N) nitrique", concentration: 13, unit: "%" },
      { name: "Potassium (K₂O)", concentration: 44, unit: "%" },
    ],
    teneurMA: 57, teneurMAUnit: "%",
    category: "engrais", familleChimique: "Nitrate de potassium",
    formulation: "GR",
    cible: ["Nutrition potassium/azote", "Qualité couleur fruit", "Tenue conservation"],
    dosePerHectareDefault: 12.5, dosePerHectareMin: 8.0, dosePerHectareMax: 20.0,
    dosePerTree: 62, doseUnit: "kg/ha", unit: "kg",
    priceDZD: 8000, supplierId: "sup-007", supplierName: "CASAP",
    expiryDate: "2028-01-01", stockInitial: 2000, stockInitialDate: "2026-01-01",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
  // 13 — Nitrate magnesium (NM — Mg+N fertirrigation, chlorophylle)
  {
    id: "prod-013", name: "Nitrate magnesium", tradeName: "Nitrate magnesium",
    registrationNumber: "PHY-DZ-2019-NM01",
    activeSubstance: "Mg(NO₃)₂ — 11N + 16 MgO",
    composition: [
      { name: "Azote (N) nitrique", concentration: 11, unit: "%" },
      { name: "Oxyde de magnésium (MgO)", concentration: 16, unit: "%" },
    ],
    teneurMA: 27, teneurMAUnit: "%",
    category: "engrais", familleChimique: "Nitrate de magnésium",
    formulation: "GR",
    cible: ["Nutrition magnésium/azote", "Synthèse chlorophylle", "Qualité goût"],
    dosePerHectareDefault: 3.0, dosePerHectareMin: 2.0, dosePerHectareMax: 5.0,
    dosePerTree: 15, doseUnit: "kg/ha", unit: "kg",
    priceDZD: 6500, supplierId: "sup-007", supplierName: "CASAP",
    expiryDate: "2028-01-01", stockInitial: 500, stockInitialDate: "2026-01-01",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
  // 14 — Sulfate ammonium (SA — N+S fertirrigation, acidification)
  {
    id: "prod-014", name: "Sulfate ammonium", tradeName: "Sulfate ammonium",
    registrationNumber: "PHY-DZ-2018-SA01",
    activeSubstance: "(NH₄)₂SO₄ — 21N + 24 SO₃",
    composition: [
      { name: "Azote (N) ammoniacal", concentration: 21, unit: "%" },
      { name: "Soufre (SO₃)", concentration: 24, unit: "%" },
    ],
    teneurMA: 45, teneurMAUnit: "%",
    category: "engrais", familleChimique: "Ammonium sulfaté",
    formulation: "GR",
    cible: ["Nutrition azote/soufre", "Acidification pH sol", "Fertirrigation"],
    dosePerHectareDefault: 3.0, dosePerHectareMin: 2.0, dosePerHectareMax: 6.0,
    dosePerTree: 15, doseUnit: "kg/ha", unit: "kg",
    priceDZD: 3200, supplierId: "sup-007", supplierName: "CASAP",
    expiryDate: "2028-01-01", stockInitial: 1000, stockInitialDate: "2026-01-01",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
  // 15 — DAP 18-44 (diammonium phosphate, démarrage végétation pommier)
  {
    id: "prod-015", name: "DAP 18-44", tradeName: "DAP 18-44",
    registrationNumber: "PHY-DZ-2018-DA01",
    activeSubstance: "Diammonium phosphate 18N + 44 P₂O₅",
    composition: [
      { name: "Azote (N)", concentration: 18, unit: "%" },
      { name: "Phosphore (P₂O₅)", concentration: 44, unit: "%" },
    ],
    teneurMA: 62, teneurMAUnit: "%",
    category: "engrais", familleChimique: "Engrais NP diammonique",
    formulation: "GR",
    cible: ["Nutrition phosphore/azote", "Enracinement", "Démarrage végétation"],
    dosePerHectareDefault: 10.0, dosePerHectareMin: 5.0, dosePerHectareMax: 20.0,
    dosePerTree: 50, doseUnit: "kg/ha", unit: "qx",
    priceDZD: 6000, supplierId: "sup-007", supplierName: "CASAP",
    expiryDate: "2028-01-01", stockInitial: 300, stockInitialDate: "2026-01-01",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
];

export const stockEntries: StockEntry[] = [
  // Entrées 2026 — sources PDF "Fiche Entrées-Sorties"
  { id: "se-001", productId: "prod-005", productName: "LAIT DE CHAUX", type: "entry", movementCategory: "entree_fournisseur", quantity: 2650, unit: "kg", date: "2026-01-15", reference: "BON-2026-001", lotNumber: "LOT-LC-2026-A", supplierId: "sup-001", supplierName: "BLIDA", unitPriceDZD: 200, validatedBy: "Amine Boudiaf" },
  { id: "se-002", productId: "prod-001", productName: "BELLIS", type: "entry", movementCategory: "entree_distributeur", quantity: 960, unit: "kg", date: "2026-03-01", reference: "BON-2026-002", lotNumber: "LOT-BL-2026-B", supplierId: "sup-002", supplierName: "DEVAGRI", unitPriceDZD: 8500, validatedBy: "Amine Boudiaf" },
  { id: "se-003", productId: "prod-003", productName: "CORAGEN", type: "entry", movementCategory: "entree_fournisseur", quantity: 12, unit: "L", date: "2026-06-01", reference: "BON-2026-003", lotNumber: "LOT-CO-2026-C", supplierId: "sup-003", supplierName: "SRID", unitPriceDZD: 45000, validatedBy: "Amine Boudiaf" },
  { id: "se-004", productId: "prod-006", productName: "ACIDE PHOSPHORIQUE", type: "entry", movementCategory: "entree_fournisseur", quantity: 2850, unit: "L", date: "2026-02-28", reference: "BON-2026-004", lotNumber: "LOT-AP-2026-D", supplierId: "sup-008", supplierName: "HYGINDUST", unitPriceDZD: 1500, validatedBy: "Karim Saidi" },
  { id: "se-005", productId: "prod-011", productName: "Nitrate calcium", type: "entry", movementCategory: "entree_fournisseur", quantity: 504, unit: "qx", date: "2026-01-20", reference: "BON-2026-005", lotNumber: "LOT-NC-2026-E", supplierId: "sup-007", supplierName: "CASAP", unitPriceDZD: 4500, validatedBy: "Amine Boudiaf" },
  // Sorties traitements
  { id: "se-006", productId: "prod-001", productName: "BELLIS", type: "exit", movementCategory: "sortie_traitement", quantity: -12, unit: "kg", date: "2026-04-15", treatmentId: "trt-001", notes: "Traitement tavelure — Maguer Grande S1 (13ha × 0.8 kg/ha)", validatedBy: "Karim Saidi" },
  { id: "se-007", productId: "prod-003", productName: "CORAGEN", type: "exit", movementCategory: "sortie_traitement", quantity: -2.5, unit: "L", date: "2026-05-20", treatmentId: "trt-002", notes: "Traitement carpocapse — CARRIERE S1+S2 (14.09ha × 0.175 L/ha)", validatedBy: "Youcef Hadj" },
  { id: "se-008", productId: "prod-002", productName: "BOUILLIE BORDELAISE", type: "exit", movementCategory: "sortie_traitement", quantity: -42, unit: "kg", date: "2026-03-25", treatmentId: "trt-003", notes: "Traitement bactériose — LA BASE 1 (35ha × 1.2 kg/ha)", validatedBy: "Mehdi Benali" },
  { id: "se-009", productId: "prod-007", productName: "Agrizote", type: "exit", movementCategory: "sortie_traitement", quantity: -25, unit: "L", date: "2026-04-01", treatmentId: "trt-004", notes: "Fertigation AN — HADJA FATMA (dose fixe 0.01 L)", validatedBy: "Karim Saidi" },
  { id: "se-010", productId: "prod-011", productName: "Nitrate calcium", type: "exit", movementCategory: "sortie_traitement", quantity: -115.43, unit: "qx", date: "2026-04-10", treatmentId: "trt-005", notes: "Fertigation NC — CARRIERE S1 (6.79ha × 17 = 115.43 Qx)", validatedBy: "Youcef Hadj" },
  { id: "se-011", productId: "prod-008", productName: "GREEN ZINC", type: "exit", movementCategory: "sortie_traitement", quantity: -16.975, unit: "L", date: "2026-04-10", treatmentId: "trt-005", notes: "Fertigation GZ — CARRIERE S1 (6.79ha × 2.5 = 16.975 L)", validatedBy: "Youcef Hadj" },
  { id: "se-012", productId: "prod-005", productName: "LAIT DE CHAUX", type: "exit", movementCategory: "sortie_traitement", quantity: -1800, unit: "kg", date: "2026-01-20", treatmentId: "trt-006", notes: "Badigeonnage troncs dormance — LA BASE 1+2+3 (60ha)", validatedBy: "Mehdi Benali" },
];

export const stockLevels: StockLevel[] = [
  // BELLIS : 960.2 kg confirmé inventaire 11/06/2026
  { productId: "prod-001", productName: "BELLIS", category: "fongicide", currentQuantity: 960.2, unit: "kg", minThreshold: 50, maxCapacity: 1500, lastEntryDate: "2026-03-01", lastExitDate: "2026-04-15", totalValueDZD: 8161700, avgUnitPriceDZD: 8500, status: "ok", expiryDate: "2028-03-01", lotNumber: "LOT-BL-2026-B", stockInitial: 960 },
  { productId: "prod-002", productName: "BOUILLIE BORDELAISE", category: "fongicide", currentQuantity: 458, unit: "kg", minThreshold: 100, maxCapacity: 1000, lastEntryDate: "2026-01-01", lastExitDate: "2026-03-25", totalValueDZD: 549600, avgUnitPriceDZD: 1200, status: "ok", expiryDate: "2027-12-01", lotNumber: "LOT-BB-2026-A", stockInitial: 500 },
  { productId: "prod-003", productName: "CORAGEN", category: "insecticide", currentQuantity: 9.5, unit: "L", minThreshold: 5, maxCapacity: 50, lastEntryDate: "2026-06-01", lastExitDate: "2026-05-20", totalValueDZD: 427500, avgUnitPriceDZD: 45000, status: "low", expiryDate: "2027-06-01", lotNumber: "LOT-CO-2026-C", stockInitial: 12 },
  { productId: "prod-004", productName: "AGROIL BLUE", category: "insecticide", currentQuantity: 300, unit: "L", minThreshold: 50, maxCapacity: 600, lastEntryDate: "2026-01-01", lastExitDate: null, totalValueDZD: 540000, avgUnitPriceDZD: 1800, status: "ok", expiryDate: "2028-01-01", lotNumber: "LOT-AO-2026-A", stockInitial: 300 },
  { productId: "prod-005", productName: "LAIT DE CHAUX", category: "dormance", currentQuantity: 850, unit: "kg", minThreshold: 200, maxCapacity: 3000, lastEntryDate: "2026-01-15", lastExitDate: "2026-01-20", totalValueDZD: 170000, avgUnitPriceDZD: 200, status: "ok", expiryDate: "2027-12-31", lotNumber: "LOT-LC-2026-A", stockInitial: 2650 },
  { productId: "prod-006", productName: "ACIDE PHOSPHORIQUE", category: "acide_phosphorique", currentQuantity: 2825, unit: "L", minThreshold: 200, maxCapacity: 5000, lastEntryDate: "2026-02-28", lastExitDate: "2026-04-01", totalValueDZD: 4237500, avgUnitPriceDZD: 1500, status: "ok", expiryDate: "2028-02-28", lotNumber: "LOT-AP-2026-D", stockInitial: 2850 },
  // Agrizote : 2900 L confirmé inventaire 11/06/2026
  { productId: "prod-007", productName: "Agrizote", category: "acide_nitrique", currentQuantity: 2900, unit: "L", minThreshold: 200, maxCapacity: 5000, lastEntryDate: "2026-01-01", lastExitDate: "2026-04-01", totalValueDZD: 2320000, avgUnitPriceDZD: 800, status: "ok", expiryDate: "2027-12-31", lotNumber: "LOT-AN-2026-A", stockInitial: 2900 },
  { productId: "prod-008", productName: "GREEN ZINC", category: "engrais", currentQuantity: 183, unit: "L", minThreshold: 30, maxCapacity: 300, lastEntryDate: "2026-01-01", lastExitDate: "2026-04-10", totalValueDZD: 640500, avgUnitPriceDZD: 3500, status: "ok", expiryDate: "2028-06-01", lotNumber: "LOT-GZ-2026-A", stockInitial: 200 },
  { productId: "prod-009", productName: "BLACK JAK", category: "acide_humique", currentQuantity: 350, unit: "L", minThreshold: 50, maxCapacity: 600, lastEntryDate: "2026-01-01", lastExitDate: null, totalValueDZD: 980000, avgUnitPriceDZD: 2800, status: "ok", expiryDate: "2028-01-01", lotNumber: "LOT-BJ-2026-A", stockInitial: 350 },
  { productId: "prod-010", productName: "FERTIGEL 00.52.34", category: "engrais", currentQuantity: 500, unit: "L", minThreshold: 100, maxCapacity: 800, lastEntryDate: "2026-01-01", lastExitDate: null, totalValueDZD: 2100000, avgUnitPriceDZD: 4200, status: "ok", expiryDate: "2028-06-01", lotNumber: "LOT-FG-2026-A", stockInitial: 500 },
  // Nitrate calcium : péremption 01/08/2026 — 388.57 Qx restants après sorties
  { productId: "prod-011", productName: "Nitrate calcium", category: "engrais", currentQuantity: 388.57, unit: "qx", minThreshold: 50, maxCapacity: 700, lastEntryDate: "2026-01-20", lastExitDate: "2026-04-10", totalValueDZD: 1748565, avgUnitPriceDZD: 4500, status: "ok", expiryDate: "2026-08-01", lotNumber: "LOT-NC-2026-E", stockInitial: 504 },
  { productId: "prod-012", productName: "Nitrate potassium", category: "engrais", currentQuantity: 2000, unit: "kg", minThreshold: 200, maxCapacity: 3000, lastEntryDate: "2026-01-01", lastExitDate: null, totalValueDZD: 16000000, avgUnitPriceDZD: 8000, status: "ok", expiryDate: "2028-01-01", lotNumber: "LOT-NK-2026-A", stockInitial: 2000 },
  { productId: "prod-013", productName: "Nitrate magnesium", category: "engrais", currentQuantity: 500, unit: "kg", minThreshold: 50, maxCapacity: 800, lastEntryDate: "2026-01-01", lastExitDate: null, totalValueDZD: 3250000, avgUnitPriceDZD: 6500, status: "ok", expiryDate: "2028-01-01", lotNumber: "LOT-NM-2026-A", stockInitial: 500 },
  { productId: "prod-014", productName: "Sulfate ammonium", category: "engrais", currentQuantity: 1000, unit: "kg", minThreshold: 100, maxCapacity: 2000, lastEntryDate: "2026-01-01", lastExitDate: null, totalValueDZD: 3200000, avgUnitPriceDZD: 3200, status: "ok", expiryDate: "2028-01-01", lotNumber: "LOT-SA-2026-A", stockInitial: 1000 },
  { productId: "prod-015", productName: "DAP 18-44", category: "engrais", currentQuantity: 300, unit: "qx", minThreshold: 30, maxCapacity: 500, lastEntryDate: "2026-01-01", lastExitDate: null, totalValueDZD: 1800000, avgUnitPriceDZD: 6000, status: "ok", expiryDate: "2028-01-01", lotNumber: "LOT-DA-2026-A", stockInitial: 300 },
];

// --- HIERARCHICAL PARCELS ---

export const parcelles: Parcelle[] = [
  // 13 stations Lechehab — Tenira (SBA) — pommier, ~352 ha total
  {
    id: "p-001", name: "LA BASE 1", parentId: null, exploitationId: "exp-001",
    areaHectares: 35.0, cropType: "Pommier", variete: "Golden Delicious / Fuji",
    cultureType: "arboriculture", soilType: "Argilo-calcaire",
    site: "Domaine SBA — Tenira", zone: "Tenira Est", secteur: "BASE",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2016-03-01",
    observations: "Station principale. Réseau fertigation multi-secteurs. Pommier en pleine production.",
    center: [35.012, -0.543], color: "#10b981",
    boundary: [[35.015, -0.547], [35.015, -0.539], [35.009, -0.539], [35.009, -0.547]],
    lastTreatmentDate: "2026-03-25", treatmentCount: 4,
  },
  {
    id: "p-002", name: "LA BASE 2", parentId: null, exploitationId: "exp-001",
    areaHectares: 30.0, cropType: "Pommier", variete: "Royal Gala / Fuji",
    cultureType: "arboriculture", soilType: "Argilo-calcaire",
    site: "Domaine SBA — Tenira", zone: "Tenira Est", secteur: "BASE",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2017-02-20",
    center: [35.008, -0.540], color: "#059669",
    boundary: [[35.011, -0.544], [35.011, -0.536], [35.005, -0.536], [35.005, -0.544]],
    lastTreatmentDate: "2026-03-25", treatmentCount: 3,
  },
  {
    id: "p-003", name: "LA BASE 3", parentId: null, exploitationId: "exp-001",
    areaHectares: 28.0, cropType: "Pommier", variete: "Granny Smith / Golden",
    cultureType: "arboriculture", soilType: "Argilo-calcaire",
    site: "Domaine SBA — Tenira", zone: "Tenira Est", secteur: "BASE",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2017-03-10",
    center: [35.005, -0.538], color: "#34d399",
    boundary: [[35.008, -0.542], [35.008, -0.534], [35.002, -0.534], [35.002, -0.542]],
    lastTreatmentDate: "2026-01-20", treatmentCount: 2,
  },
  {
    id: "p-004", name: "Maguer Grande", parentId: null, exploitationId: "exp-001",
    areaHectares: 45.0, cropType: "Pommier", variete: "Golden Delicious / Starkrimson",
    cultureType: "arboriculture", soilType: "Limon argileux",
    site: "Domaine SBA — Tenira", zone: "Tenira Nord", secteur: "MAGUER",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2015-02-15",
    observations: "Grande parcelle irrigable — S1 (13 ha) certifiée fertigation.",
    center: [35.016, -0.557], color: "#0ea5e9",
    boundary: [[35.020, -0.562], [35.020, -0.552], [35.012, -0.552], [35.012, -0.562]],
    lastTreatmentDate: "2026-04-15", treatmentCount: 5,
  },
  {
    id: "p-005", name: "25 Ha", parentId: null, exploitationId: "exp-001",
    areaHectares: 25.0, cropType: "Pommier", variete: "Fuji / Golden Delicious",
    cultureType: "arboriculture", soilType: "Argilo-calcaire",
    site: "Domaine SBA — Tenira", zone: "Tenira Centre", secteur: "25HA",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2018-03-01",
    center: [35.012, -0.552], color: "#6ee7b7",
    boundary: [[35.015, -0.557], [35.015, -0.547], [35.009, -0.547], [35.009, -0.557]],
    lastTreatmentDate: null, treatmentCount: 1,
  },
  {
    id: "p-006", name: "13 Ha Devil Gala", parentId: null, exploitationId: "exp-001",
    areaHectares: 13.0, cropType: "Pommier", variete: "Devil Gala",
    cultureType: "arboriculture", soilType: "Argilo-calcaire",
    site: "Domaine SBA — Tenira", zone: "Tenira Centre", secteur: "GALA",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2020-03-15",
    observations: "Variété Gala premium. Plantation récente. Fertigation DAP intensif.",
    center: [35.009, -0.560], color: "#f59e0b",
    boundary: [[35.011, -0.564], [35.011, -0.556], [35.007, -0.556], [35.007, -0.564]],
    lastTreatmentDate: "2026-06-10", treatmentCount: 2,
  },
  {
    id: "p-007", name: "2 Ha SYS V", parentId: null, exploitationId: "exp-001",
    areaHectares: 2.0, cropType: "Pommier", variete: "Fuji SYS V",
    cultureType: "arboriculture", soilType: "Argilo-limoneux",
    site: "Domaine SBA — Tenira", zone: "Tenira Ouest", secteur: "SYS",
    irrigation: "goutte_a_goutte", densitePlantation: 1200, densiteUnit: "arbres/ha",
    dateImplantation: "2022-02-01",
    observations: "Parcelle expérimentale haute densité — système de conduite SYSV.",
    center: [35.019, -0.536], color: "#8b5cf6",
    boundary: [[35.020, -0.538], [35.020, -0.534], [35.018, -0.534], [35.018, -0.538]],
    lastTreatmentDate: null, treatmentCount: 0,
  },
  {
    id: "p-008", name: "HADJA FATMA", parentId: null, exploitationId: "exp-001",
    areaHectares: 32.0, cropType: "Pommier", variete: "Golden Delicious / Granny Smith",
    cultureType: "arboriculture", soilType: "Calcaire argileux",
    site: "Domaine SBA — Tenira", zone: "Tenira Ouest", secteur: "HADJA",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2016-02-10",
    center: [35.023, -0.549], color: "#ef4444",
    boundary: [[35.027, -0.554], [35.027, -0.544], [35.019, -0.544], [35.019, -0.554]],
    lastTreatmentDate: "2026-04-01", treatmentCount: 3,
  },
  {
    id: "p-009", name: "CARRIERE", parentId: null, exploitationId: "exp-001",
    areaHectares: 14.09, cropType: "Pommier", variete: "Golden Delicious / Royal Gala",
    cultureType: "arboriculture", soilType: "Argilo-caillouteux",
    site: "Domaine SBA — Tenira", zone: "Tenira Sud", secteur: "CARRIERE",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2018-02-28",
    observations: "Secteurs S1 (6.79ha) et S2 (7.30ha) — données fertigation confirmées PDF.",
    center: [35.026, -0.563], color: "#ec4899",
    boundary: [[35.029, -0.567], [35.029, -0.559], [35.023, -0.559], [35.023, -0.567]],
    lastTreatmentDate: "2026-05-20", treatmentCount: 4,
  },
  {
    id: "p-010", name: "HJIRA PETITE", parentId: null, exploitationId: "exp-001",
    areaHectares: 20.0, cropType: "Pommier", variete: "Starkrimson / Fuji",
    cultureType: "arboriculture", soilType: "Argilo-calcaire",
    site: "Domaine SBA — Tenira", zone: "Tenira Sud", secteur: "HJIRA",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2017-03-01",
    center: [34.998, -0.546], color: "#84cc16",
    boundary: [[35.001, -0.550], [35.001, -0.542], [34.995, -0.542], [34.995, -0.550]],
    lastTreatmentDate: null, treatmentCount: 1,
  },
  {
    id: "p-011", name: "Maguer Petite", parentId: null, exploitationId: "exp-001",
    areaHectares: 22.0, cropType: "Pommier", variete: "Golden Delicious",
    cultureType: "arboriculture", soilType: "Limon argileux",
    site: "Domaine SBA — Tenira", zone: "Tenira Nord", secteur: "MAGUER",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2019-02-15",
    center: [35.014, -0.554], color: "#a3e635",
    boundary: [[35.017, -0.558], [35.017, -0.550], [35.011, -0.550], [35.011, -0.558]],
    lastTreatmentDate: null, treatmentCount: 0,
  },
  {
    id: "p-012", name: "LYCEE", parentId: null, exploitationId: "exp-001",
    areaHectares: 38.0, cropType: "Pommier", variete: "Fuji / Royal Gala / Golden",
    cultureType: "arboriculture", soilType: "Argilo-calcaire profond",
    site: "Domaine SBA — Tenira", zone: "Tenira Centre", secteur: "LYCEE",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2015-03-10",
    observations: "Grande station productive — fertigation NK + FERTIGEL validée.",
    center: [35.003, -0.541], color: "#06b6d4",
    boundary: [[35.007, -0.546], [35.007, -0.536], [34.999, -0.536], [34.999, -0.546]],
    lastTreatmentDate: "2026-05-15", treatmentCount: 5,
  },
  {
    id: "p-013", name: "HJIRA GRANDE", parentId: null, exploitationId: "exp-001",
    areaHectares: 48.0, cropType: "Pommier", variete: "Golden Delicious / Starkrimson / Fuji",
    cultureType: "arboriculture", soilType: "Argilo-calcaire",
    site: "Domaine SBA — Tenira", zone: "Tenira Sud", secteur: "HJIRA",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2014-03-01",
    observations: "Plus grande parcelle de l'exploitation — 3 variétés en production.",
    center: [34.993, -0.551], color: "#7c3aed",
    boundary: [[34.998, -0.558], [34.998, -0.544], [34.988, -0.544], [34.988, -0.558]],
    lastTreatmentDate: null, treatmentCount: 2,
  },
];

function generateGpsTrack(center: [number, number], points: number): [number, number][] {
  const track: [number, number][] = [];
  let lat = center[0] - 0.002;
  let lng = center[1] - 0.003;
  for (let i = 0; i < points; i++) {
    lat += (Math.random() - 0.3) * 0.0003;
    lng += 0.00008 + Math.random() * 0.00004;
    if (i % 20 === 0 && i > 0) { lat += 0.0008; lng = center[1] - 0.003 + Math.random() * 0.0002; }
    track.push([lat, lng]);
  }
  return track;
}

export const treatments: Treatment[] = [
  {
    id: "trt-001", parcelleId: "p-004", parcelleName: "Maguer Grande",
    operatorId: "op-001", operatorName: "Mehdi Benali", status: "completed", type: "pulverisation",
    products: [{ productId: "prod-001", productName: "BELLIS", quantityUsed: 12, unit: "kg", dosePerHectare: 0.8, dosePerTree: 4, stockEntryId: "se-006" }],
    plannedDate: "2026-04-15", executedDate: "2026-04-15", completedDate: "2026-04-15",
    areaTreatedHectares: 13.0, treesCount: 10400, weatherConditions: "Ensoleillé, 22°C, vent calme",
    temperature: 22, humidity: 42, windSpeed: 7,
    totalCostDZD: 102000, volumeBouillie: 1300, volumeBouillieUnit: "L",
    gpsTrack: generateGpsTrack([35.016, -0.557], 120),
  },
  {
    id: "trt-002", parcelleId: "p-009", parcelleName: "CARRIERE",
    operatorId: "op-002", operatorName: "Youcef Hadj", status: "completed", type: "pulverisation",
    products: [{ productId: "prod-003", productName: "CORAGEN", quantityUsed: 2.5, unit: "L", dosePerHectare: 0.175, dosePerTree: 1, stockEntryId: "se-007" }],
    plannedDate: "2026-05-20", executedDate: "2026-05-20", completedDate: "2026-05-20",
    areaTreatedHectares: 14.09, treesCount: 11272, weatherConditions: "Nuageux, 25°C",
    temperature: 25, humidity: 48, windSpeed: 10,
    totalCostDZD: 112500, volumeBouillie: 1409, volumeBouillieUnit: "L",
    gpsTrack: generateGpsTrack([35.026, -0.563], 90),
  },
  {
    id: "trt-003", parcelleId: "p-001", parcelleName: "LA BASE 1",
    operatorId: "op-003", operatorName: "Karim Saidi", status: "completed", type: "pulverisation",
    products: [{ productId: "prod-002", productName: "BOUILLIE BORDELAISE", quantityUsed: 42, unit: "kg", dosePerHectare: 3.0, dosePerTree: 15, stockEntryId: "se-008" }],
    plannedDate: "2026-03-25", executedDate: "2026-03-25", completedDate: "2026-03-25",
    areaTreatedHectares: 35.0, treesCount: 28000, weatherConditions: "Couvert, 16°C",
    temperature: 16, humidity: 62, windSpeed: 14,
    totalCostDZD: 50400, volumeBouillie: 3500, volumeBouillieUnit: "L",
    gpsTrack: generateGpsTrack([35.012, -0.543], 180),
  },
  {
    id: "trt-004", parcelleId: "p-008", parcelleName: "HADJA FATMA",
    operatorId: "op-003", operatorName: "Karim Saidi", status: "completed", type: "fertilisation",
    products: [{ productId: "prod-007", productName: "Agrizote", quantityUsed: 25, unit: "L", dosePerHectare: 0.01, stockEntryId: "se-009" }],
    plannedDate: "2026-04-01", executedDate: "2026-04-01", completedDate: "2026-04-01",
    areaTreatedHectares: 32.0, weatherConditions: "Ensoleillé, 20°C",
    temperature: 20, humidity: 45, windSpeed: 8,
    totalCostDZD: 20000, volumeBouillie: 3200, volumeBouillieUnit: "L",
    gpsTrack: generateGpsTrack([35.023, -0.549], 100),
  },
  {
    id: "trt-005", parcelleId: "p-009", parcelleName: "CARRIERE",
    operatorId: "op-001", operatorName: "Mehdi Benali", status: "completed", type: "fertilisation",
    products: [
      { productId: "prod-011", productName: "Nitrate calcium", quantityUsed: 115.43, unit: "qx", dosePerHectare: 17.0, stockEntryId: "se-010" },
      { productId: "prod-008", productName: "GREEN ZINC", quantityUsed: 16.975, unit: "L", dosePerHectare: 2.5, stockEntryId: "se-011" },
    ],
    plannedDate: "2026-04-10", executedDate: "2026-04-10", completedDate: "2026-04-10",
    areaTreatedHectares: 6.79, weatherConditions: "Ensoleillé, 21°C",
    temperature: 21, humidity: 40, windSpeed: 6,
    totalCostDZD: 578085,
    gpsTrack: generateGpsTrack([35.026, -0.563], 60),
  },
  {
    id: "trt-006", parcelleId: "p-001", parcelleName: "LA BASE 1",
    operatorId: "op-002", operatorName: "Youcef Hadj", status: "completed", type: "pulverisation",
    products: [{ productId: "prod-005", productName: "LAIT DE CHAUX", quantityUsed: 1800, unit: "kg", dosePerHectare: 30.0, dosePerTree: 150, stockEntryId: "se-012" }],
    plannedDate: "2026-01-20", executedDate: "2026-01-20", completedDate: "2026-01-20",
    areaTreatedHectares: 60.0, treesCount: 48000, weatherConditions: "Ensoleillé, 12°C, dormance",
    temperature: 12, humidity: 55, windSpeed: 10,
    totalCostDZD: 360000,
    gpsTrack: generateGpsTrack([35.010, -0.541], 200),
  },
  {
    id: "trt-007", parcelleId: "p-005", parcelleName: "25 Ha",
    operatorId: "op-001", operatorName: "Mehdi Benali", status: "planned", type: "pulverisation",
    products: [{ productId: "prod-001", productName: "BELLIS", quantityUsed: 5, unit: "kg", dosePerHectare: 0.8 }],
    plannedDate: "2026-06-20", executedDate: null, completedDate: null,
    areaTreatedHectares: 5.33, totalCostDZD: 42500,
  },
  {
    id: "trt-008", parcelleId: "p-006", parcelleName: "13 Ha Devil Gala",
    operatorId: "op-003", operatorName: "Karim Saidi", status: "in_progress", type: "fertilisation",
    products: [
      { productId: "prod-015", productName: "DAP 18-44", quantityUsed: 130, unit: "qx", dosePerHectare: 10.0 },
      { productId: "prod-009", productName: "BLACK JAK", quantityUsed: 19.5, unit: "L", dosePerHectare: 1.5 },
    ],
    plannedDate: "2026-06-10", executedDate: "2026-06-10", completedDate: null,
    areaTreatedHectares: 13.0, weatherConditions: "Partiellement nuageux, 28°C",
    temperature: 28, humidity: 38, windSpeed: 12,
    totalCostDZD: 834600,
  },
  {
    id: "trt-009", parcelleId: "p-012", parcelleName: "LYCEE",
    operatorId: "op-002", operatorName: "Youcef Hadj", status: "completed", type: "fertilisation",
    products: [
      { productId: "prod-012", productName: "Nitrate potassium", quantityUsed: 234, unit: "kg", dosePerHectare: 12.5 },
      { productId: "prod-010", productName: "FERTIGEL 00.52.34", quantityUsed: 114, unit: "L", dosePerHectare: 3.0 },
    ],
    plannedDate: "2026-05-15", executedDate: "2026-05-15", completedDate: "2026-05-15",
    areaTreatedHectares: 38.0, weatherConditions: "Ensoleillé, 24°C",
    temperature: 24, humidity: 36, windSpeed: 8,
    totalCostDZD: 2352000,
  },
];

export const operators: Operator[] = [
  { id: "op-001", fullName: "Mehdi Benali", identifierCode: "OP-001", phone: "+213 555 11 22 33", role: "operator", certificationNumber: "CERT-OP-2024-001", active: true, totalTreatments: 47, lastTreatmentDate: "2026-03-17" },
  { id: "op-002", fullName: "Youcef Hadj", identifierCode: "OP-002", phone: "+213 555 44 55 66", role: "operator", certificationNumber: "CERT-OP-2024-002", active: true, totalTreatments: 32, lastTreatmentDate: "2026-03-17" },
  { id: "op-003", fullName: "Karim Saidi", identifierCode: "OP-003", phone: "+213 555 77 88 99", role: "technician", certificationNumber: "CERT-TEC-2024-001", active: true, totalTreatments: 28, lastTreatmentDate: "2026-03-16" },
  { id: "op-004", fullName: "Amine Boudiaf", identifierCode: "OP-004", phone: "+213 555 00 11 22", role: "agronomist", certificationNumber: "CERT-AGR-2024-001", active: true, totalTreatments: 15, lastTreatmentDate: "2026-02-28" },
];

export const alerts: Alert[] = [
  { id: "a-001", type: "stock_expiry", severity: "critical", message: "Nitrate calcium (LOT-NC-2026-E) — péremption le 01/08/2026 dans 47 jours. Stock restant : 388 Qx. Utiliser en priorité.", relatedId: "prod-011", timestamp: "2026-06-15T08:00:00Z", acknowledged: false },
  { id: "a-002", type: "low_stock", severity: "warning", message: "CORAGEN — stock bas : 9.5L (seuil 5L). Anticiper commande avant campagne juillet (carpocapse 2ᵉ génération).", relatedId: "prod-003", timestamp: "2026-06-15T08:00:00Z", acknowledged: false },
  { id: "a-003", type: "treatment_overdue", severity: "warning", message: "Traitement TRT-007 (BELLIS sur 25 Ha) planifié le 20/06/2026 — vérifier stock disponible (960 kg).", relatedId: "trt-007", timestamp: "2026-06-15T06:00:00Z", acknowledged: false },
  { id: "a-004", type: "parcel_untreated", severity: "info", message: "HJIRA GRANDE — aucun traitement phytosanitaire enregistré depuis 45 jours. Vérifier programme tavelure.", relatedId: "p-013", timestamp: "2026-06-15T00:00:00Z", acknowledged: false },
  { id: "a-005", type: "dar_violation", severity: "critical", message: "DAR BELLIS (7j) — ne pas récolter avant le 22/04/2026 sur Maguer Grande (TRT-001).", relatedId: "trt-001", timestamp: "2026-06-15T00:00:00Z", acknowledged: true },
  { id: "a-006", type: "low_stock", severity: "info", message: "Maguer Petite et 2 Ha SYS V — aucun traitement enregistré. Inclure dans prochaine rotation BOUILLIE BORDELAISE.", relatedId: "p-011", timestamp: "2026-06-14T08:00:00Z", acknowledged: false },
];

export const dashboardStats: DashboardStats = {
  totalProducts: 15,
  totalStockValue: 46125365,
  lowStockCount: 1,
  totalParcelles: 13,
  totalAreaHectares: 352.09,
  activeTreatments: 1,
  completedTreatments: 6,
  treatmentsThisMonth: 9,
  treatmentsTrend: 12.5,
  operatorsActive: 3,
  alertsCount: 5,
  avgCostPerHectare: 3200,
  totalTransfers: 0,
  productsExpiringSoon: 1,
};

export const weeklyTreatmentData = [
  { day: "Lun", treatments: 1, cost: 102000 },
  { day: "Mar", treatments: 0, cost: 0 },
  { day: "Mer", treatments: 2, cost: 690585 },
  { day: "Jeu", treatments: 1, cost: 20000 },
  { day: "Ven", treatments: 1, cost: 50400 },
  { day: "Sam", treatments: 1, cost: 112500 },
  { day: "Dim", treatments: 2, cost: 3186600 },
];

export const stockByCategory = [
  { category: "Fongicide", value: 8711300, count: 2 },
  { category: "Insecticide", value: 967500, count: 2 },
  { category: "Dormance", value: 170000, count: 1 },
  { category: "Acide Phosphorique", value: 4237500, count: 1 },
  { category: "Acide Nitrique", value: 2320000, count: 1 },
  { category: "Engrais", value: 28738565, count: 8 },
  { category: "Acide Humique", value: 980000, count: 1 },
];

// --- FERTILIZER UNIT CALCULATIONS ---

export const fertilizerCalculations: FertilizerUnit[] = [
  {
    productId: "prod-011", productName: "Nitrate calcium",
    parcelleId: "p-009", parcelleName: "CARRIERE",
    areaHectares: 6.79,
    nitrogenN: 15.5, phosphorusP2O5: 0, potassiumK2O: 0,
    doseApplied: 17.0, unit: "qx/ha",
    unitsN: 17.91, unitsP: 0, unitsK: 0,
    date: "2026-04-10",
  },
  {
    productId: "prod-015", productName: "DAP 18-44",
    parcelleId: "p-006", parcelleName: "13 Ha Devil Gala",
    areaHectares: 13.0,
    nitrogenN: 18, phosphorusP2O5: 44, potassiumK2O: 0,
    doseApplied: 10.0, unit: "qx/ha",
    unitsN: 23.4, unitsP: 57.2, unitsK: 0,
    date: "2026-06-10",
  },
  {
    productId: "prod-012", productName: "Nitrate potassium",
    parcelleId: "p-012", parcelleName: "LYCEE",
    areaHectares: 38.0,
    nitrogenN: 13, phosphorusP2O5: 0, potassiumK2O: 44,
    doseApplied: 12.5, unit: "kg/ha",
    unitsN: 61.75, unitsP: 0, unitsK: 209.0,
    date: "2026-05-15",
  },
];

/**
 * Calculate fertilizer units (unités d'engrais) for a given product and dose
 * Formula: Units = (dose_kg_per_ha × concentration_%) / 100 × area_ha
 */
export function calculateFertilizerUnits(
  doseKgPerHa: number,
  concentrationPercent: number,
  areaHectares: number
): number {
  return (doseKgPerHa * concentrationPercent / 100) * areaHectares;
}

/**
 * Get NPK units breakdown for an engrais product at a given dose
 */
export function getNPKUnits(product: PhytoProduct, doseKgPerHa: number, areaHectares: number) {
  const nIngredient = product.composition.find(c => c.name.includes("Azote") || c.name.includes("N"));
  const pIngredient = product.composition.find(c => c.name.includes("Phosphore") || c.name.includes("P₂O₅"));
  const kIngredient = product.composition.find(c => c.name.includes("Potassium") || c.name.includes("K₂O"));

  return {
    unitsN: nIngredient ? calculateFertilizerUnits(doseKgPerHa, nIngredient.concentration, areaHectares) : 0,
    unitsP: pIngredient ? calculateFertilizerUnits(doseKgPerHa, pIngredient.concentration, areaHectares) : 0,
    unitsK: kIngredient ? calculateFertilizerUnits(doseKgPerHa, kIngredient.concentration, areaHectares) : 0,
  };
}

// --- HELPERS ---

export function getAllParcelles(): Parcelle[] {
  const all: Parcelle[] = [];
  parcelles.forEach((p) => {
    all.push(p);
    if (p.children) p.children.forEach((c) => all.push(c));
  });
  return all;
}

export function getParcelleById(id: string): Parcelle | undefined {
  for (const p of parcelles) {
    if (p.id === id) return p;
    if (p.children) {
      const child = p.children.find((c) => c.id === id);
      if (child) return child;
    }
  }
  return undefined;
}

export const categoryLabels: Record<string, string> = {
  fongicide: "Fongicide",
  herbicide: "Herbicide",
  insecticide: "Insecticide",
  engrais: "Engrais",
  adjuvant: "Adjuvant",
  semence: "Semence",
  acaricide: "Acaricide",
  acide: "Acide",
  acide_phosphorique: "Acide Phosphorique",
  acide_nitrique: "Acide Nitrique",
  acide_sulfurique: "Acide Sulfurique",
  acide_humique: "Acide Humique",
  matiere_organique: "Matière Organique",
  fer: "Fer",
  dormance: "Dormance",
  hormone: "Hormone",
  drmx: "DRMX",
  autre: "Autre",
};

export const categoryColors: Record<string, string> = {
  fongicide: "#10b981",
  herbicide: "#f59e0b",
  insecticide: "#ef4444",
  engrais: "#06b6d4",
  adjuvant: "#8b5cf6",
  semence: "#ec4899",
  acaricide: "#f97316",
  acide: "#14b8a6",
  acide_phosphorique: "#14b8a6",
  acide_nitrique: "#0ea5e9",
  acide_sulfurique: "#eab308",
  acide_humique: "#a78bfa",
  matiere_organique: "#84cc16",
  fer: "#f472b6",
  dormance: "#6366f1",
  hormone: "#d946ef",
  drmx: "#6366f1",
  autre: "#94a3b8",
};

export const formulationLabels: Record<Formulation, string> = {
  EC: "Concentré émulsionnable",
  SC: "Suspension concentrée",
  WP: "Poudre mouillable",
  WG: "Granulés dispersibles",
  SL: "Concentré soluble",
  EW: "Émulsion aqueuse",
  CS: "Suspension de capsules",
  SE: "Suspension-émulsion",
  OD: "Suspension huileuse",
  GR: "Granulés",
  FS: "Suspension pour traitement de semences",
  autre: "Autre",
};

export const cultureTypeLabels: Record<CultureType, string> = {
  arboriculture: "Arboriculture",
  cereales: "Céréales",
  viticulture: "Viticulture",
  maraichage: "Maraîchage",
  oleiculture: "Oléiculture",
  agrumes: "Agrumes",
  autre: "Autre",
};

export const irrigationLabels: Record<string, string> = {
  goutte_a_goutte: "Goutte-à-goutte",
  aspersion: "Aspersion",
  gravitaire: "Gravitaire",
  pluvial: "Pluvial",
  aucune: "Aucune",
};

export const movementCategoryLabels: Record<StockMovementCategory, string> = {
  entree_fournisseur: "Entrée fournisseur",
  entree_distributeur: "Entrée distributeur",
  retour_parcelle: "Retour parcelle",
  sortie_traitement: "Sortie traitement",
  sortie_interne: "Sortie interne",
  transfert_externe: "Transfert externe",
  ajustement_inventaire: "Ajustement inventaire",
  perte_peremption: "Perte / péremption",
};

export const movementCategoryColors: Record<StockMovementCategory, string> = {
  entree_fournisseur: "#10b981",
  entree_distributeur: "#06b6d4",
  retour_parcelle: "#8b5cf6",
  sortie_traitement: "#ef4444",
  sortie_interne: "#f59e0b",
  transfert_externe: "#f97316",
  ajustement_inventaire: "#6b7280",
  perte_peremption: "#991b1b",
};

export const treatmentTypeLabels: Record<string, string> = {
  pulverisation: "Pulvérisation",
  fertilisation: "Fertilisation",
  desherbage: "Désherbage",
  traitement_semence: "Traitement de semence",
  autre: "Autre",
};

export const supplierTypeLabels: Record<string, string> = {
  distributeur: "Distributeur",
  fournisseur: "Fournisseur",
  fabricant: "Fabricant",
};