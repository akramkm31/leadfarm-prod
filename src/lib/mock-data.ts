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

export type ProductCategory = "fongicide" | "herbicide" | "insecticide" | "engrais" | "adjuvant" | "semence" | "acaricide" | "acide_phosphorique" | "acide_nitrique" | "acide_sulfurique" | "acide_humique" | "matiere_organique" | "fer" | "drmx" | "autre";

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
  name: "Domaine Khelifa",
  registrationNumber: "DZ-13-AG-2024-0147",
  wilaya: "Tlemcen",
  commune: "Hennaya",
  site: "Ferme Principale",
  subscriptionPlan: "pro",
};

export const suppliers: Supplier[] = [
  { id: "sup-001", name: "Agri-Phyto Oran", type: "distributeur", phone: "+213 555 12 34 56", email: "contact@agriphyto-oran.dz", city: "Oran", wilaya: "Oran", registrationNumber: "RC-31-2020-B1247", totalDeliveries: 24, totalValueDZD: 2850000, lastDeliveryDate: "2026-03-16", active: true },
  { id: "sup-002", name: "PhytoMag Mascara", type: "fournisseur", phone: "+213 555 78 90 12", email: "info@phytomag.dz", city: "Mascara", wilaya: "Mascara", registrationNumber: "RC-29-2019-A0893", totalDeliveries: 18, totalValueDZD: 1920000, lastDeliveryDate: "2026-03-05", active: true },
  { id: "sup-003", name: "Semences du Tell", type: "fournisseur", phone: "+213 555 34 56 78", email: "vente@semencestell.dz", city: "Tiaret", wilaya: "Tiaret", registrationNumber: "RC-14-2021-C0456", totalDeliveries: 12, totalValueDZD: 980000, lastDeliveryDate: "2026-03-01", active: true },
  { id: "sup-004", name: "AgroChem Relizane", type: "fabricant", phone: "+213 555 90 12 34", email: "commercial@agrochem-rel.dz", city: "Relizane", wilaya: "Relizane", registrationNumber: "RC-48-2018-D0127", totalDeliveries: 15, totalValueDZD: 1540000, lastDeliveryDate: "2026-03-08", active: true },
  { id: "sup-005", name: "BioProtect Alger", type: "distributeur", phone: "+213 555 45 67 89", email: "info@bioprotect.dz", city: "Alger", wilaya: "Alger", registrationNumber: "RC-16-2022-E0891", totalDeliveries: 8, totalValueDZD: 620000, lastDeliveryDate: "2026-02-20", active: true },
];

export const products: PhytoProduct[] = [
  {
    id: "prod-001", name: "Fongicide Cuivre", tradeName: "Cuivrol 50 WP",
    registrationNumber: "PHY-DZ-2024-001", activeSubstance: "Hydroxyde de cuivre",
    composition: [{ name: "Hydroxyde de cuivre", concentration: 500, unit: "g/kg" }],
    teneurMA: 500, teneurMAUnit: "g/kg",
    category: "fongicide", familleChimique: "Cuivriques (inorganiques)",
    formulation: "WP",
    cible: ["Mildiou", "Tavelure", "Bactériose"],
    dosePerHectareDefault: 2.5, dosePerHectareMin: 2.0, dosePerHectareMax: 3.5,
    dosePerTree: 15, doseUnit: "kg/ha", unit: "kg",
    priceDZD: 3200, supplierId: "sup-001", supplierName: "Agri-Phyto Oran",
    expiryDate: "2028-06-15", stockInitial: 180, stockInitialDate: "2025-12-01",
    dar: 21, reentryDelay: 24, toxicityClass: "III", pictograms: ["GHS07", "GHS09"],
  },
  {
    id: "prod-002", name: "Herbicide Glyphosate", tradeName: "Glycel 360 SL",
    registrationNumber: "PHY-DZ-2024-002", activeSubstance: "Glyphosate",
    composition: [{ name: "Glyphosate (sel d'isopropylamine)", concentration: 360, unit: "g/L" }],
    teneurMA: 360, teneurMAUnit: "g/L",
    category: "herbicide", familleChimique: "Acides aminés (phosphonoglycine)",
    formulation: "SL",
    cible: ["Adventices annuelles", "Chiendent", "Graminées vivaces"],
    dosePerHectareDefault: 3.0, dosePerHectareMin: 2.0, dosePerHectareMax: 4.0,
    doseUnit: "L/ha", unit: "L",
    priceDZD: 4500, supplierId: "sup-001", supplierName: "Agri-Phyto Oran",
    expiryDate: "2027-12-20", stockInitial: 120, stockInitialDate: "2025-12-01",
    dar: 30, reentryDelay: 48, toxicityClass: "III", pictograms: ["GHS05", "GHS09"],
  },
  {
    id: "prod-003", name: "Insecticide Lambda", tradeName: "Karaté Zeon 050 CS",
    registrationNumber: "PHY-DZ-2024-003", activeSubstance: "Lambda-cyhalothrine",
    composition: [{ name: "Lambda-cyhalothrine", concentration: 50, unit: "g/L" }],
    teneurMA: 50, teneurMAUnit: "g/L",
    category: "insecticide", familleChimique: "Pyréthrinoïdes de synthèse",
    formulation: "CS",
    cible: ["Carpocapse", "Pucerons", "Tordeuses", "Cératite"],
    dosePerHectareDefault: 0.5, dosePerHectareMin: 0.3, dosePerHectareMax: 0.75,
    dosePerTree: 5, doseUnit: "L/ha", unit: "L",
    priceDZD: 5800, supplierId: "sup-002", supplierName: "PhytoMag Mascara",
    expiryDate: "2027-09-30", stockInitial: 40, stockInitialDate: "2025-12-01",
    dar: 14, reentryDelay: 24, toxicityClass: "II", pictograms: ["GHS06", "GHS09"],
  },
  {
    id: "prod-004", name: "Engrais Foliaire NPK", tradeName: "Fertileaf 20-20-20",
    registrationNumber: "PHY-DZ-2024-004", activeSubstance: "NPK 20-20-20",
    composition: [
      { name: "Azote (N)", concentration: 20, unit: "%" },
      { name: "Phosphore (P₂O₅)", concentration: 20, unit: "%" },
      { name: "Potassium (K₂O)", concentration: 20, unit: "%" },
    ],
    teneurMA: 60, teneurMAUnit: "%",
    category: "engrais", familleChimique: "Engrais minéraux composés",
    formulation: "WG",
    cible: ["Nutrition foliaire", "Carence NPK"],
    dosePerHectareDefault: 5.0, dosePerHectareMin: 3.0, dosePerHectareMax: 7.0,
    dosePerTree: 30, doseUnit: "kg/ha", unit: "kg",
    priceDZD: 1800, supplierId: "sup-003", supplierName: "Semences du Tell",
    expiryDate: "2029-01-01", stockInitial: 400, stockInitialDate: "2025-12-01",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
  {
    id: "prod-005", name: "Acaricide Soufre", tradeName: "Thiovit Jet 80 WG",
    registrationNumber: "PHY-DZ-2024-005", activeSubstance: "Soufre mouillable",
    composition: [{ name: "Soufre micronisé", concentration: 800, unit: "g/kg" }],
    teneurMA: 800, teneurMAUnit: "g/kg",
    category: "acaricide", familleChimique: "Inorganiques (soufre)",
    formulation: "WG",
    cible: ["Oïdium", "Acariens", "Ériophyides"],
    dosePerHectareDefault: 4.0, dosePerHectareMin: 3.0, dosePerHectareMax: 6.0,
    dosePerTree: 25, doseUnit: "kg/ha", unit: "kg",
    priceDZD: 2100, supplierId: "sup-002", supplierName: "PhytoMag Mascara",
    expiryDate: "2028-11-30", stockInitial: 80, stockInitialDate: "2025-12-01",
    dar: 7, reentryDelay: 24, toxicityClass: "IV", pictograms: ["GHS07"],
  },
  {
    id: "prod-006", name: "Herbicide Sélectif 2,4-D", tradeName: "Désormone 600 SL",
    registrationNumber: "PHY-DZ-2024-006", activeSubstance: "2,4-D amine",
    composition: [{ name: "2,4-D (sel de diméthylamine)", concentration: 600, unit: "g/L" }],
    teneurMA: 600, teneurMAUnit: "g/L",
    category: "herbicide", familleChimique: "Aryloxyacides (auxiniques)",
    formulation: "SL",
    cible: ["Dicotylédones annuelles", "Adventices à feuilles larges"],
    dosePerHectareDefault: 1.5, dosePerHectareMin: 1.0, dosePerHectareMax: 2.0,
    doseUnit: "L/ha", unit: "L",
    priceDZD: 2800, supplierId: "sup-004", supplierName: "AgroChem Relizane",
    expiryDate: "2027-08-15", stockInitial: 60, stockInitialDate: "2025-12-01",
    dar: 28, reentryDelay: 48, toxicityClass: "II", pictograms: ["GHS05", "GHS07"],
  },
  {
    id: "prod-007", name: "Insecticide Chlorpyrifos", tradeName: "Dursban 480 EC",
    registrationNumber: "PHY-DZ-2024-007", activeSubstance: "Chlorpyrifos-éthyl",
    composition: [{ name: "Chlorpyrifos-éthyl", concentration: 480, unit: "g/L" }],
    teneurMA: 480, teneurMAUnit: "g/L",
    category: "insecticide", familleChimique: "Organophosphorés",
    formulation: "EC",
    cible: ["Cochenilles", "Mouche de l'olive", "Psylle"],
    dosePerHectareDefault: 1.0, dosePerHectareMin: 0.75, dosePerHectareMax: 1.5,
    dosePerTree: 8, doseUnit: "L/ha", unit: "L",
    priceDZD: 6200, supplierId: "sup-001", supplierName: "Agri-Phyto Oran",
    expiryDate: "2026-05-20", stockInitial: 25, stockInitialDate: "2025-12-01",
    dar: 21, reentryDelay: 72, toxicityClass: "II", pictograms: ["GHS06", "GHS08", "GHS09"],
  },
  {
    id: "prod-008", name: "Adjuvant Mouillant", tradeName: "Héliosol",
    registrationNumber: "PHY-DZ-2024-008", activeSubstance: "Tensioactif non-ionique",
    composition: [{ name: "Terpènes de pin", concentration: 736, unit: "g/L" }],
    teneurMA: 736, teneurMAUnit: "g/L",
    category: "adjuvant", familleChimique: "Tensioactifs (terpènes)",
    formulation: "SL",
    cible: ["Amélioration mouillabilité", "Agent d'étalement"],
    dosePerHectareDefault: 0.2, dosePerHectareMin: 0.1, dosePerHectareMax: 0.3,
    doseUnit: "L/ha", unit: "L",
    priceDZD: 1500, supplierId: "sup-004", supplierName: "AgroChem Relizane",
    expiryDate: "2028-03-01", stockInitial: 30, stockInitialDate: "2025-12-01",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
  {
    id: "prod-009", name: "Engrais Azoté Urée", tradeName: "Urée 46% N",
    registrationNumber: "PHY-DZ-2024-009", activeSubstance: "Urée",
    composition: [{ name: "Azote (N)", concentration: 46, unit: "%" }],
    teneurMA: 46, teneurMAUnit: "%",
    category: "engrais", familleChimique: "Engrais azotés simples",
    formulation: "GR",
    cible: ["Carence azotée", "Croissance végétative"],
    dosePerHectareDefault: 150, dosePerHectareMin: 100, dosePerHectareMax: 250,
    dosePerTree: 200, doseUnit: "kg/ha", unit: "kg",
    priceDZD: 950, supplierId: "sup-003", supplierName: "Semences du Tell",
    expiryDate: "2030-01-01", stockInitial: 1000, stockInitialDate: "2025-12-01",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
  {
    id: "prod-010", name: "Sulfate de Potassium", tradeName: "SOP 50% K₂O",
    registrationNumber: "PHY-DZ-2024-010", activeSubstance: "Sulfate de potassium",
    composition: [
      { name: "Potassium (K₂O)", concentration: 50, unit: "%" },
      { name: "Soufre (S)", concentration: 18, unit: "%" },
    ],
    teneurMA: 50, teneurMAUnit: "%",
    category: "engrais", familleChimique: "Engrais potassiques",
    formulation: "GR",
    cible: ["Carence potassique", "Maturation fruits"],
    dosePerHectareDefault: 120, dosePerHectareMin: 80, dosePerHectareMax: 200,
    dosePerTree: 150, doseUnit: "kg/ha", unit: "kg",
    priceDZD: 1200, supplierId: "sup-005", supplierName: "BioProtect Alger",
    expiryDate: "2030-01-01", stockInitial: 600, stockInitialDate: "2025-12-01",
    dar: 0, reentryDelay: 0, toxicityClass: "IV", pictograms: [],
  },
];

export const stockEntries: StockEntry[] = [
  { id: "se-001", productId: "prod-001", productName: "Fongicide Cuivre", type: "entry", movementCategory: "entree_fournisseur", quantity: 200, unit: "kg", date: "2026-02-15", reference: "BON-2024-001", lotNumber: "LOT-CU-2026-A", supplierId: "sup-001", supplierName: "Agri-Phyto Oran", unitPriceDZD: 3200, validatedBy: "Amine Boudiaf" },
  { id: "se-002", productId: "prod-002", productName: "Herbicide Glyphosate", type: "entry", movementCategory: "entree_distributeur", quantity: 150, unit: "L", date: "2026-02-20", reference: "BON-2024-002", lotNumber: "LOT-GLY-2026-B", supplierId: "sup-001", supplierName: "Agri-Phyto Oran", unitPriceDZD: 4500, validatedBy: "Amine Boudiaf" },
  { id: "se-003", productId: "prod-003", productName: "Insecticide Lambda", type: "entry", movementCategory: "entree_fournisseur", quantity: 50, unit: "L", date: "2026-02-25", reference: "BON-2024-003", lotNumber: "LOT-LAM-2026-C", supplierId: "sup-002", supplierName: "PhytoMag Mascara", unitPriceDZD: 5800, validatedBy: "Amine Boudiaf" },
  { id: "se-004", productId: "prod-004", productName: "Engrais Foliaire NPK", type: "entry", movementCategory: "entree_fournisseur", quantity: 500, unit: "kg", date: "2026-03-01", reference: "BON-2024-004", lotNumber: "LOT-NPK-2026-D", supplierId: "sup-003", supplierName: "Semences du Tell", unitPriceDZD: 1800, validatedBy: "Amine Boudiaf" },
  { id: "se-005", productId: "prod-001", productName: "Fongicide Cuivre", type: "exit", movementCategory: "sortie_traitement", quantity: -45, unit: "kg", date: "2026-03-10", treatmentId: "trt-001", notes: "Traitement Blé Nord", validatedBy: "Mehdi Benali" },
  { id: "se-006", productId: "prod-002", productName: "Herbicide Glyphosate", type: "exit", movementCategory: "sortie_traitement", quantity: -78, unit: "L", date: "2026-03-12", treatmentId: "trt-002", notes: "Désherbage Parcelle Centre", validatedBy: "Youcef Hadj" },
  { id: "se-007", productId: "prod-003", productName: "Insecticide Lambda", type: "exit", movementCategory: "sortie_traitement", quantity: -14.35, unit: "L", date: "2026-03-15", treatmentId: "trt-003", notes: "Traitement Agrumes", validatedBy: "Karim Saidi" },
  { id: "se-008", productId: "prod-005", productName: "Acaricide Soufre", type: "entry", movementCategory: "entree_fournisseur", quantity: 100, unit: "kg", date: "2026-03-05", reference: "BON-2024-005", lotNumber: "LOT-SOU-2026-E", supplierId: "sup-002", supplierName: "PhytoMag Mascara", unitPriceDZD: 2100, validatedBy: "Amine Boudiaf" },
  { id: "se-009", productId: "prod-006", productName: "Herbicide Sélectif 2,4-D", type: "entry", movementCategory: "entree_distributeur", quantity: 80, unit: "L", date: "2026-03-08", reference: "BON-2024-006", lotNumber: "LOT-24D-2026-F", supplierId: "sup-004", supplierName: "AgroChem Relizane", unitPriceDZD: 2800, validatedBy: "Amine Boudiaf" },
  { id: "se-010", productId: "prod-007", productName: "Insecticide Chlorpyrifos", type: "entry", movementCategory: "entree_fournisseur", quantity: 30, unit: "L", date: "2026-03-02", reference: "BON-2024-007", lotNumber: "LOT-CHL-2026-G", supplierId: "sup-001", supplierName: "Agri-Phyto Oran", unitPriceDZD: 6200, validatedBy: "Amine Boudiaf" },
  { id: "se-011", productId: "prod-004", productName: "Engrais Foliaire NPK", type: "exit", movementCategory: "sortie_traitement", quantity: -225, unit: "kg", date: "2026-03-14", treatmentId: "trt-004", notes: "Fertilisation Vigne", validatedBy: "Mehdi Benali" },
  { id: "se-012", productId: "prod-008", productName: "Adjuvant Mouillant", type: "entry", movementCategory: "entree_fournisseur", quantity: 40, unit: "L", date: "2026-03-03", reference: "BON-2024-008", lotNumber: "LOT-ADJ-2026-H", supplierId: "sup-004", supplierName: "AgroChem Relizane", unitPriceDZD: 1500, validatedBy: "Amine Boudiaf" },
  { id: "se-013", productId: "prod-005", productName: "Acaricide Soufre", type: "exit", movementCategory: "sortie_traitement", quantity: -36, unit: "kg", date: "2026-03-16", treatmentId: "trt-005", notes: "Traitement Vigne", validatedBy: "Karim Saidi" },
  { id: "se-014", productId: "prod-001", productName: "Fongicide Cuivre", type: "entry", movementCategory: "entree_distributeur", quantity: 100, unit: "kg", date: "2026-03-16", reference: "BON-2024-009", lotNumber: "LOT-CU-2026-I", supplierId: "sup-001", supplierName: "Agri-Phyto Oran", unitPriceDZD: 3400, validatedBy: "Amine Boudiaf" },
  // Transfers
  { id: "se-015", productId: "prod-002", productName: "Herbicide Glyphosate", type: "transfer", movementCategory: "transfert_externe", quantity: -20, unit: "L", date: "2026-03-13", reference: "TRF-2024-001", transferDestination: "Exploitation Benali", transferDestinationWilaya: "Sidi Bel Abbès", transferDestinationSite: "Ferme Nord", notes: "Transfert vers exploitation voisine", validatedBy: "Amine Boudiaf" },
  { id: "se-016", productId: "prod-008", productName: "Adjuvant Mouillant", type: "exit", movementCategory: "sortie_interne", quantity: -5, unit: "L", date: "2026-03-14", notes: "Consommation interne — nettoyage matériel", validatedBy: "Mehdi Benali" },
  { id: "se-017", productId: "prod-003", productName: "Insecticide Lambda", type: "entry", movementCategory: "retour_parcelle", quantity: 2, unit: "L", date: "2026-03-15", returnFromParcelleId: "p-002-a", returnFromParcelleName: "Est-A — Sigoise", notes: "Reliquat non utilisé — retour magasin", validatedBy: "Karim Saidi" },
  // New products entries
  { id: "se-018", productId: "prod-009", productName: "Engrais Azoté Urée", type: "entry", movementCategory: "entree_fournisseur", quantity: 800, unit: "kg", date: "2026-02-10", reference: "BON-2024-010", lotNumber: "LOT-URE-2026-J", supplierId: "sup-003", supplierName: "Semences du Tell", unitPriceDZD: 950, validatedBy: "Amine Boudiaf" },
  { id: "se-019", productId: "prod-010", productName: "Sulfate de Potassium", type: "entry", movementCategory: "entree_distributeur", quantity: 500, unit: "kg", date: "2026-02-12", reference: "BON-2024-011", lotNumber: "LOT-SOP-2026-K", supplierId: "sup-005", supplierName: "BioProtect Alger", unitPriceDZD: 1200, validatedBy: "Amine Boudiaf" },
  { id: "se-020", productId: "prod-005", productName: "Acaricide Soufre", type: "exit", movementCategory: "perte_peremption", quantity: -10, unit: "kg", date: "2026-03-10", notes: "Lot périmé — destruction", validatedBy: "Amine Boudiaf" },
];

export const stockLevels: StockLevel[] = [
  { productId: "prod-001", productName: "Fongicide Cuivre", category: "fongicide", currentQuantity: 255, unit: "kg", minThreshold: 50, maxCapacity: 500, lastEntryDate: "2026-03-16", lastExitDate: "2026-03-10", totalValueDZD: 816000, avgUnitPriceDZD: 3200, status: "ok", expiryDate: "2028-06-15", lotNumber: "LOT-CU-2026-I", stockInitial: 180 },
  { productId: "prod-002", productName: "Herbicide Glyphosate", category: "herbicide", currentQuantity: 52, unit: "L", minThreshold: 40, maxCapacity: 300, lastEntryDate: "2026-02-20", lastExitDate: "2026-03-13", totalValueDZD: 234000, avgUnitPriceDZD: 4500, status: "ok", expiryDate: "2027-12-20", lotNumber: "LOT-GLY-2026-B", stockInitial: 120 },
  { productId: "prod-003", productName: "Insecticide Lambda", category: "insecticide", currentQuantity: 37.65, unit: "L", minThreshold: 20, maxCapacity: 100, lastEntryDate: "2026-03-15", lastExitDate: "2026-03-15", totalValueDZD: 218370, avgUnitPriceDZD: 5800, status: "ok", expiryDate: "2027-09-30", lotNumber: "LOT-LAM-2026-C", stockInitial: 40 },
  { productId: "prod-004", productName: "Engrais Foliaire NPK", category: "engrais", currentQuantity: 275, unit: "kg", minThreshold: 100, maxCapacity: 1000, lastEntryDate: "2026-03-01", lastExitDate: "2026-03-14", totalValueDZD: 495000, avgUnitPriceDZD: 1800, status: "ok", expiryDate: "2029-01-01", lotNumber: "LOT-NPK-2026-D", stockInitial: 400 },
  { productId: "prod-005", productName: "Acaricide Soufre", category: "acaricide", currentQuantity: 54, unit: "kg", minThreshold: 30, maxCapacity: 200, lastEntryDate: "2026-03-05", lastExitDate: "2026-03-16", totalValueDZD: 113400, avgUnitPriceDZD: 2100, status: "ok", expiryDate: "2028-11-30", lotNumber: "LOT-SOU-2026-E", stockInitial: 80 },
  { productId: "prod-006", productName: "Herbicide Sélectif 2,4-D", category: "herbicide", currentQuantity: 80, unit: "L", minThreshold: 25, maxCapacity: 200, lastEntryDate: "2026-03-08", lastExitDate: null, totalValueDZD: 224000, avgUnitPriceDZD: 2800, status: "ok", expiryDate: "2027-08-15", lotNumber: "LOT-24D-2026-F", stockInitial: 60 },
  { productId: "prod-007", productName: "Insecticide Chlorpyrifos", category: "insecticide", currentQuantity: 12, unit: "L", minThreshold: 15, maxCapacity: 80, lastEntryDate: "2026-03-02", lastExitDate: null, totalValueDZD: 74400, avgUnitPriceDZD: 6200, status: "low", expiryDate: "2026-05-20", lotNumber: "LOT-CHL-2026-G", stockInitial: 25 },
  { productId: "prod-008", productName: "Adjuvant Mouillant", category: "adjuvant", currentQuantity: 3, unit: "L", minThreshold: 10, maxCapacity: 60, lastEntryDate: "2026-03-03", lastExitDate: "2026-03-14", totalValueDZD: 4500, avgUnitPriceDZD: 1500, status: "critical", expiryDate: "2028-03-01", lotNumber: "LOT-ADJ-2026-H", stockInitial: 30 },
  { productId: "prod-009", productName: "Engrais Azoté Urée", category: "engrais", currentQuantity: 800, unit: "kg", minThreshold: 200, maxCapacity: 2000, lastEntryDate: "2026-02-10", lastExitDate: null, totalValueDZD: 760000, avgUnitPriceDZD: 950, status: "ok", expiryDate: "2030-01-01", lotNumber: "LOT-URE-2026-J", stockInitial: 1000 },
  { productId: "prod-010", productName: "Sulfate de Potassium", category: "engrais", currentQuantity: 500, unit: "kg", minThreshold: 150, maxCapacity: 1500, lastEntryDate: "2026-02-12", lastExitDate: null, totalValueDZD: 600000, avgUnitPriceDZD: 1200, status: "ok", expiryDate: "2030-01-01", lotNumber: "LOT-SOP-2026-K", stockInitial: 600 },
];

// --- HIERARCHICAL PARCELS ---

export const parcelles: Parcelle[] = [
  {
    id: "p-001", name: "Parcelle Nord — Pommiers", parentId: null, exploitationId: "exp-001",
    areaHectares: 75.0, cropType: "Pommier", variete: "Golden Delicious / Starkrimson",
    cultureType: "arboriculture", soilType: "Argilo-calcaire",
    site: "Ferme Principale", zone: "Zone Nord", secteur: "Secteur A",
    irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
    dateImplantation: "2018-03-15",
    observations: "Verger en pleine production. Taille de fructification effectuée en janvier.",
    center: [34.9925, -0.536], color: "#10b981",
    boundary: [[34.9960, -0.5420], [34.9960, -0.5300], [34.9890, -0.5300], [34.9890, -0.5420]],
    lastTreatmentDate: "2026-03-15", treatmentCount: 8,
    children: [
      {
        id: "p-001-a", name: "Nord-A — Golden Delicious", parentId: "p-001", exploitationId: "exp-001",
        areaHectares: 42.0, cropType: "Pommier", variete: "Golden Delicious",
        cultureType: "arboriculture", soilType: "Argilo-calcaire",
        site: "Ferme Principale", zone: "Zone Nord", secteur: "Secteur A1",
        irrigation: "goutte_a_goutte", densitePlantation: 800, densiteUnit: "arbres/ha",
        dateImplantation: "2018-03-15",
        center: [34.9940, -0.5380], color: "#34d399",
        boundary: [[34.9960, -0.5420], [34.9960, -0.5360], [34.9910, -0.5360], [34.9910, -0.5420]],
        lastTreatmentDate: "2026-03-15", treatmentCount: 5,
      },
      {
        id: "p-001-b", name: "Nord-B — Starkrimson", parentId: "p-001", exploitationId: "exp-001",
        areaHectares: 33.0, cropType: "Pommier", variete: "Starkrimson",
        cultureType: "arboriculture", soilType: "Argilo-calcaire",
        site: "Ferme Principale", zone: "Zone Nord", secteur: "Secteur A2",
        irrigation: "goutte_a_goutte", densitePlantation: 750, densiteUnit: "arbres/ha",
        dateImplantation: "2019-02-20",
        center: [34.9940, -0.5320], color: "#6ee7b7",
        boundary: [[34.9960, -0.5360], [34.9960, -0.5300], [34.9910, -0.5300], [34.9910, -0.5360]],
        lastTreatmentDate: "2026-03-10", treatmentCount: 3,
      },
    ],
  },
  {
    id: "p-002", name: "Parcelle Est — Oliviers", parentId: null, exploitationId: "exp-001",
    areaHectares: 38.0, cropType: "Olivier", variete: "Sigoise / Chemlal",
    cultureType: "oleiculture", soilType: "Calcaire",
    site: "Ferme Principale", zone: "Zone Est", secteur: "Secteur B",
    irrigation: "pluvial", densitePlantation: 200, densiteUnit: "arbres/ha",
    dateImplantation: "2010-11-01",
    observations: "Oliveraie traditionnelle avec densité faible. Complantation prévue 2027.",
    center: [34.9855, -0.5260], color: "#f59e0b",
    boundary: [[34.9890, -0.5300], [34.9890, -0.5220], [34.9820, -0.5220], [34.9820, -0.5300]],
    lastTreatmentDate: "2026-03-15", treatmentCount: 6,
    children: [
      {
        id: "p-002-a", name: "Est-A — Sigoise", parentId: "p-002", exploitationId: "exp-001",
        areaHectares: 22.0, cropType: "Olivier", variete: "Sigoise",
        cultureType: "oleiculture", soilType: "Calcaire",
        site: "Ferme Principale", zone: "Zone Est", secteur: "Secteur B1",
        irrigation: "pluvial", densitePlantation: 220, densiteUnit: "arbres/ha",
        dateImplantation: "2010-11-01",
        center: [34.9870, -0.5270], color: "#fbbf24",
        boundary: [[34.9890, -0.5300], [34.9890, -0.5260], [34.9840, -0.5260], [34.9840, -0.5300]],
        lastTreatmentDate: "2026-03-15", treatmentCount: 4,
      },
      {
        id: "p-002-b", name: "Est-B — Chemlal", parentId: "p-002", exploitationId: "exp-001",
        areaHectares: 16.0, cropType: "Olivier", variete: "Chemlal",
        cultureType: "oleiculture", soilType: "Calcaire",
        site: "Ferme Principale", zone: "Zone Est", secteur: "Secteur B2",
        irrigation: "pluvial", densitePlantation: 180, densiteUnit: "arbres/ha",
        dateImplantation: "2012-02-10",
        center: [34.9840, -0.5240], color: "#fcd34d",
        boundary: [[34.9890, -0.5260], [34.9890, -0.5220], [34.9840, -0.5220], [34.9840, -0.5260]],
        lastTreatmentDate: "2026-03-08", treatmentCount: 2,
      },
    ],
  },
  {
    id: "p-003", name: "Parcelle Sud — Vigne", parentId: null, exploitationId: "exp-001",
    areaHectares: 28.0, cropType: "Vigne", variete: "Cinsault / Carignan",
    cultureType: "viticulture", soilType: "Sablonneux",
    site: "Ferme Principale", zone: "Zone Sud", secteur: "Secteur C",
    irrigation: "goutte_a_goutte", densitePlantation: 4000, densiteUnit: "pieds/ha",
    dateImplantation: "2015-03-01",
    observations: "Vignoble de cuve. Palissage renouvelé en 2025.",
    center: [34.9790, -0.5380], color: "#8b5cf6",
    boundary: [[34.9820, -0.5440], [34.9820, -0.5320], [34.9760, -0.5320], [34.9760, -0.5440]],
    lastTreatmentDate: "2026-03-16", treatmentCount: 7,
    children: [
      {
        id: "p-003-a", name: "Sud-A — Cinsault", parentId: "p-003", exploitationId: "exp-001",
        areaHectares: 16.0, cropType: "Vigne", variete: "Cinsault",
        cultureType: "viticulture", soilType: "Sablonneux",
        site: "Ferme Principale", zone: "Zone Sud", secteur: "Secteur C1",
        irrigation: "goutte_a_goutte", densitePlantation: 4000, densiteUnit: "pieds/ha",
        dateImplantation: "2015-03-01",
        center: [34.9800, -0.5410], color: "#a78bfa",
        boundary: [[34.9820, -0.5440], [34.9820, -0.5380], [34.9775, -0.5380], [34.9775, -0.5440]],
        lastTreatmentDate: "2026-03-16", treatmentCount: 4,
      },
      {
        id: "p-003-b", name: "Sud-B — Carignan", parentId: "p-003", exploitationId: "exp-001",
        areaHectares: 12.0, cropType: "Vigne", variete: "Carignan",
        cultureType: "viticulture", soilType: "Sablonneux",
        site: "Ferme Principale", zone: "Zone Sud", secteur: "Secteur C2",
        irrigation: "goutte_a_goutte", densitePlantation: 4000, densiteUnit: "pieds/ha",
        dateImplantation: "2016-02-15",
        center: [34.9800, -0.5350], color: "#c4b5fd",
        boundary: [[34.9820, -0.5380], [34.9820, -0.5320], [34.9775, -0.5320], [34.9775, -0.5380]],
        lastTreatmentDate: "2026-03-12", treatmentCount: 3,
      },
    ],
  },
  {
    id: "p-004", name: "Parcelle Ouest — Maraîchage", parentId: null, exploitationId: "exp-001",
    areaHectares: 18.0, cropType: "Maraîchage", variete: "Tomate / Poivron / Courgette",
    cultureType: "maraichage", soilType: "Limoneux",
    site: "Ferme Principale", zone: "Zone Ouest", secteur: "Secteur D",
    irrigation: "aspersion", densitePlantation: 25000, densiteUnit: "plants/ha",
    dateImplantation: "2026-02-01",
    observations: "Cultures de saison. Rotation annuelle. Sous tunnel plastique partiel.",
    center: [34.9880, -0.5480], color: "#ef4444",
    boundary: [[34.9910, -0.5530], [34.9910, -0.5430], [34.9850, -0.5430], [34.9850, -0.5530]],
    lastTreatmentDate: null, treatmentCount: 0,
  },
  {
    id: "p-005", name: "Parcelle Centre — Agrumes", parentId: null, exploitationId: "exp-001",
    areaHectares: 25.0, cropType: "Agrumes", variete: "Clémentine / Navel",
    cultureType: "agrumes", soilType: "Argilo-limoneux",
    site: "Ferme Annexe", zone: "Zone Centre", secteur: "Secteur E",
    irrigation: "goutte_a_goutte", densitePlantation: 500, densiteUnit: "arbres/ha",
    dateImplantation: "2014-11-20",
    observations: "Verger d'agrumes en production. Greffe sur porte-greffe Citrange Carrizo.",
    center: [34.9860, -0.5350], color: "#06b6d4",
    boundary: [[34.9890, -0.5400], [34.9890, -0.5300], [34.9830, -0.5300], [34.9830, -0.5400]],
    lastTreatmentDate: "2026-03-12", treatmentCount: 4,
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
    id: "trt-001", parcelleId: "p-001", parcelleName: "Parcelle Nord — Pommiers", sousParcelleId: "p-001-a", sousParcelleName: "Nord-A — Golden Delicious",
    operatorId: "op-001", operatorName: "Mehdi Benali", status: "completed", type: "pulverisation",
    products: [{ productId: "prod-001", productName: "Fongicide Cuivre", quantityUsed: 45, unit: "kg", dosePerHectare: 2.5, dosePerTree: 0.056, stockEntryId: "se-005" }],
    plannedDate: "2026-03-10", executedDate: "2026-03-10", completedDate: "2026-03-10",
    areaTreatedHectares: 42.0, treesCount: 33600, weatherConditions: "Ensoleillé, 22°C, vent faible",
    temperature: 22, humidity: 45, windSpeed: 8,
    totalCostDZD: 144000, volumeBouillie: 4200, volumeBouillieUnit: "L",
    gpsTrack: generateGpsTrack([34.9940, -0.5380], 150),
  },
  {
    id: "trt-002", parcelleId: "p-001", parcelleName: "Parcelle Nord — Pommiers", sousParcelleId: "p-001-b", sousParcelleName: "Nord-B — Starkrimson",
    operatorId: "op-002", operatorName: "Youcef Hadj", status: "completed", type: "desherbage",
    products: [
      { productId: "prod-002", productName: "Herbicide Glyphosate", quantityUsed: 78, unit: "L", dosePerHectare: 3.0 },
      { productId: "prod-008", productName: "Adjuvant Mouillant", quantityUsed: 8, unit: "L", dosePerHectare: 0.2 },
    ],
    plannedDate: "2026-03-12", executedDate: "2026-03-12", completedDate: "2026-03-12",
    areaTreatedHectares: 33.0, weatherConditions: "Nuageux, 18°C",
    temperature: 18, humidity: 60, windSpeed: 12,
    totalCostDZD: 363000, volumeBouillie: 3300, volumeBouillieUnit: "L",
    gpsTrack: generateGpsTrack([34.9940, -0.5320], 180),
  },
  {
    id: "trt-003", parcelleId: "p-002", parcelleName: "Parcelle Est — Oliviers", sousParcelleId: "p-002-a", sousParcelleName: "Est-A — Sigoise",
    operatorId: "op-003", operatorName: "Karim Saidi", status: "completed", type: "pulverisation",
    products: [{ productId: "prod-003", productName: "Insecticide Lambda", quantityUsed: 14.35, unit: "L", dosePerHectare: 0.5, dosePerTree: 0.003 }],
    plannedDate: "2026-03-15", executedDate: "2026-03-15", completedDate: "2026-03-15",
    areaTreatedHectares: 22.0, treesCount: 4840, weatherConditions: "Ensoleillé, 24°C",
    temperature: 24, humidity: 38, windSpeed: 6,
    totalCostDZD: 83230, volumeBouillie: 2200, volumeBouillieUnit: "L",
    gpsTrack: generateGpsTrack([34.9870, -0.5270], 120),
  },
  {
    id: "trt-004", parcelleId: "p-003", parcelleName: "Parcelle Sud — Vigne", sousParcelleId: "p-003-a", sousParcelleName: "Sud-A — Cinsault",
    operatorId: "op-001", operatorName: "Mehdi Benali", status: "completed", type: "fertilisation",
    products: [{ productId: "prod-004", productName: "Engrais Foliaire NPK", quantityUsed: 225, unit: "kg", dosePerHectare: 5.0, dosePerTree: 0.08 }],
    plannedDate: "2026-03-14", executedDate: "2026-03-14", completedDate: "2026-03-14",
    areaTreatedHectares: 16.0, weatherConditions: "Partiellement nuageux, 20°C",
    temperature: 20, humidity: 52, windSpeed: 10,
    totalCostDZD: 405000, volumeBouillie: 1600, volumeBouillieUnit: "L",
    gpsTrack: generateGpsTrack([34.9800, -0.5410], 100),
  },
  {
    id: "trt-005", parcelleId: "p-003", parcelleName: "Parcelle Sud — Vigne", sousParcelleId: "p-003-a", sousParcelleName: "Sud-A — Cinsault",
    operatorId: "op-003", operatorName: "Karim Saidi", status: "completed", type: "pulverisation",
    products: [{ productId: "prod-005", productName: "Acaricide Soufre", quantityUsed: 36, unit: "kg", dosePerHectare: 4.0 }],
    plannedDate: "2026-03-16", executedDate: "2026-03-16", completedDate: "2026-03-16",
    areaTreatedHectares: 16.0, weatherConditions: "Ensoleillé, 25°C, vent modéré",
    temperature: 25, humidity: 35, windSpeed: 15,
    totalCostDZD: 75600,
  },
  {
    id: "trt-006", parcelleId: "p-002", parcelleName: "Parcelle Est — Oliviers", sousParcelleId: "p-002-a", sousParcelleName: "Est-A — Sigoise",
    operatorId: "op-002", operatorName: "Youcef Hadj", status: "in_progress", type: "pulverisation",
    products: [
      { productId: "prod-001", productName: "Fongicide Cuivre", quantityUsed: 22, unit: "kg", dosePerHectare: 2.5 },
      { productId: "prod-008", productName: "Adjuvant Mouillant", quantityUsed: 2, unit: "L", dosePerHectare: 0.2 },
    ],
    plannedDate: "2026-03-17", executedDate: "2026-03-17", completedDate: null,
    areaTreatedHectares: 12.0, treesCount: 2640, weatherConditions: "Ensoleillé, 23°C",
    temperature: 23, humidity: 42, windSpeed: 9,
    totalCostDZD: 73400, volumeBouillie: 1200, volumeBouillieUnit: "L",
    gpsTrack: generateGpsTrack([34.9870, -0.5270], 60),
  },
  {
    id: "trt-007", parcelleId: "p-001", parcelleName: "Parcelle Nord — Pommiers", sousParcelleId: "p-001-a", sousParcelleName: "Nord-A — Golden Delicious",
    operatorId: "op-001", operatorName: "Mehdi Benali", status: "planned", type: "pulverisation",
    products: [{ productId: "prod-007", productName: "Insecticide Chlorpyrifos", quantityUsed: 12, unit: "L", dosePerHectare: 1.0 }],
    plannedDate: "2026-03-20", executedDate: null, completedDate: null,
    areaTreatedHectares: 42.0, treesCount: 33600, totalCostDZD: 74400,
  },
  {
    id: "trt-008", parcelleId: "p-004", parcelleName: "Parcelle Ouest — Maraîchage",
    operatorId: "op-002", operatorName: "Youcef Hadj", status: "planned", type: "desherbage",
    products: [{ productId: "prod-006", productName: "Herbicide Sélectif 2,4-D", quantityUsed: 33, unit: "L", dosePerHectare: 1.5 }],
    plannedDate: "2026-03-22", executedDate: null, completedDate: null,
    areaTreatedHectares: 22.0, totalCostDZD: 92400,
  },
  {
    id: "trt-009", parcelleId: "p-005", parcelleName: "Parcelle Centre — Agrumes",
    operatorId: "op-003", operatorName: "Karim Saidi", status: "completed", type: "fertilisation",
    products: [
      { productId: "prod-009", productName: "Engrais Azoté Urée", quantityUsed: 150, unit: "kg", dosePerHectare: 6.0 },
      { productId: "prod-010", productName: "Sulfate de Potassium", quantityUsed: 100, unit: "kg", dosePerHectare: 4.0 },
    ],
    plannedDate: "2026-03-12", executedDate: "2026-03-12", completedDate: "2026-03-12",
    areaTreatedHectares: 25.0, treesCount: 12500, weatherConditions: "Ensoleillé, 21°C",
    temperature: 21, humidity: 48, windSpeed: 7,
    totalCostDZD: 262500, volumeBouillie: 2500, volumeBouillieUnit: "L",
  },
];

export const operators: Operator[] = [
  { id: "op-001", fullName: "Mehdi Benali", identifierCode: "OP-001", phone: "+213 555 11 22 33", role: "operator", certificationNumber: "CERT-OP-2024-001", active: true, totalTreatments: 47, lastTreatmentDate: "2026-03-17" },
  { id: "op-002", fullName: "Youcef Hadj", identifierCode: "OP-002", phone: "+213 555 44 55 66", role: "operator", certificationNumber: "CERT-OP-2024-002", active: true, totalTreatments: 32, lastTreatmentDate: "2026-03-17" },
  { id: "op-003", fullName: "Karim Saidi", identifierCode: "OP-003", phone: "+213 555 77 88 99", role: "technician", certificationNumber: "CERT-TEC-2024-001", active: true, totalTreatments: 28, lastTreatmentDate: "2026-03-16" },
  { id: "op-004", fullName: "Amine Boudiaf", identifierCode: "OP-004", phone: "+213 555 00 11 22", role: "agronomist", certificationNumber: "CERT-AGR-2024-001", active: true, totalTreatments: 15, lastTreatmentDate: "2026-02-28" },
];

export const alerts: Alert[] = [
  { id: "a-001", type: "critical_stock", severity: "critical", message: "Adjuvant Mouillant — stock critique: 3L (seuil: 10L). Réapprovisionnement urgent requis.", relatedId: "prod-008", timestamp: "2026-03-17T08:00:00Z", acknowledged: false },
  { id: "a-002", type: "low_stock", severity: "warning", message: "Insecticide Chlorpyrifos — stock bas: 12L (seuil: 15L). Commander avant prochain traitement planifié (20 mars).", relatedId: "prod-007", timestamp: "2026-03-17T08:00:00Z", acknowledged: false },
  { id: "a-003", type: "parcel_untreated", severity: "warning", message: "Parcelle Ouest (Maraîchage) — aucun traitement enregistré. Dernier désherbage recommandé dépassé.", relatedId: "p-004", timestamp: "2026-03-17T00:00:00Z", acknowledged: false },
  { id: "a-004", type: "treatment_overdue", severity: "info", message: "Traitement planifié TRT-007 (Insecticide Chlorpyrifos sur Nord-A) dans 3 jours. Vérifier stock disponible.", relatedId: "trt-007", timestamp: "2026-03-17T06:00:00Z", acknowledged: false },
  { id: "a-005", type: "stock_expiry", severity: "warning", message: "Insecticide Chlorpyrifos (LOT-CHL-2026-G) — péremption le 20 mai 2026. Utiliser en priorité.", relatedId: "prod-007", timestamp: "2026-03-17T00:00:00Z", acknowledged: false },
  { id: "a-006", type: "dar_violation", severity: "critical", message: "DAR Fongicide Cuivre (21j) — ne pas récolter avant le 31 mars 2026 sur Nord-A.", relatedId: "trt-001", timestamp: "2026-03-17T00:00:00Z", acknowledged: true },
  { id: "a-007", type: "transfer_pending", severity: "info", message: "Transfert TRF-2024-001 (Glyphosate 20L) vers Sidi Bel Abbès — en attente de confirmation.", relatedId: "se-015", timestamp: "2026-03-13T14:00:00Z", acknowledged: true },
];

export const dashboardStats: DashboardStats = {
  totalProducts: 10,
  totalStockValue: 3539670,
  lowStockCount: 2,
  totalParcelles: 5,
  totalAreaHectares: 184.0,
  activeTreatments: 1,
  completedTreatments: 6,
  treatmentsThisMonth: 9,
  treatmentsTrend: 18.5,
  operatorsActive: 3,
  alertsCount: 4,
  avgCostPerHectare: 5200,
  totalTransfers: 1,
  productsExpiringSoon: 1,
};

export const weeklyTreatmentData = [
  { day: "Lun", treatments: 1, cost: 144000 },
  { day: "Mar", treatments: 0, cost: 0 },
  { day: "Mer", treatments: 2, cost: 625500 },
  { day: "Jeu", treatments: 1, cost: 405000 },
  { day: "Ven", treatments: 1, cost: 83230 },
  { day: "Sam", treatments: 1, cost: 75600 },
  { day: "Dim", treatments: 2, cost: 335900 },
];

export const stockByCategory = [
  { category: "Fongicide", value: 816000, count: 1 },
  { category: "Herbicide", value: 458000, count: 2 },
  { category: "Insecticide", value: 292770, count: 2 },
  { category: "Engrais", value: 1855000, count: 3 },
  { category: "Acaricide", value: 113400, count: 1 },
  { category: "Adjuvant", value: 4500, count: 1 },
];

// --- FERTILIZER UNIT CALCULATIONS ---

export const fertilizerCalculations: FertilizerUnit[] = [
  {
    productId: "prod-004", productName: "Engrais Foliaire NPK",
    parcelleId: "p-003-a", parcelleName: "Sud-A — Cinsault",
    areaHectares: 16.0,
    nitrogenN: 20, phosphorusP2O5: 20, potassiumK2O: 20,
    doseApplied: 5.0, unit: "kg/ha",
    unitsN: 16.0, unitsP: 16.0, unitsK: 16.0,
    date: "2026-03-14",
  },
  {
    productId: "prod-009", productName: "Engrais Azoté Urée",
    parcelleId: "p-005", parcelleName: "Parcelle Centre — Agrumes",
    areaHectares: 25.0,
    nitrogenN: 46, phosphorusP2O5: 0, potassiumK2O: 0,
    doseApplied: 6.0, unit: "kg/ha",
    unitsN: 69.0, unitsP: 0, unitsK: 0,
    date: "2026-03-12",
  },
  {
    productId: "prod-010", productName: "Sulfate de Potassium",
    parcelleId: "p-005", parcelleName: "Parcelle Centre — Agrumes",
    areaHectares: 25.0,
    nitrogenN: 0, phosphorusP2O5: 0, potassiumK2O: 50,
    doseApplied: 4.0, unit: "kg/ha",
    unitsN: 0, unitsP: 0, unitsK: 50.0,
    date: "2026-03-12",
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
  acide_phosphorique: "Acide Phosphorique",
  acide_nitrique: "Acide Nitrique",
  acide_sulfurique: "Acide Sulfurique",
  acide_humique: "Acide Humique",
  matiere_organique: "Matière Organique",
  fer: "Fer",
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
  acide_phosphorique: "#14b8a6",
  acide_nitrique: "#0ea5e9",
  acide_sulfurique: "#eab308",
  acide_humique: "#a78bfa",
  matiere_organique: "#84cc16",
  fer: "#f472b6",
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