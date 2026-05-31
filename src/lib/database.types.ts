/**
 * database.types.ts — Single source of truth for all DB types.
 * Generated shape aligned with Supabase schema.
 * DO NOT use `any`. All mappers must use these types.
 */

// ── Enums ──────────────────────────────────────────────────────────────────

export type ProductCategory =
  | "fongicide"
  | "insecticide"
  | "herbicide"
  | "engrais"
  | "adjuvant"
  | "acaricide"
  | "acide_nitrique"
  | "acide_sulfurique"
  | "acide_phosphorique"
  | "acide_humique"
  | "matiere_organique"
  | "fer"
  | "drmx"
  | "autre";

export type CultureType =
  | "a_pepins"
  | "a_noyau"
  | "vigne"
  | "agrumes"
  | "autre";

export type MovementType = "transfert" | "entree" | "retour" | "sortie";

export type SupplierRole = "fabricant" | "distributeur";

export type TreatmentStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertType =
  | "low_stock"
  | "critical_stock"
  | "stock_expiry"
  | "treatment_overdue"
  | "parcel_untreated"
  | "dar_violation"
  | "transfer_pending"
  | "negative_stock";

export type StockStatus = "ok" | "low" | "critical" | "overstock" | "negative";

// ── Row types (mirror of Supabase table columns) ───────────────────────────

export interface ExploitationRow {
  id: string;
  name: string;
  registration_number: string;
  wilaya: string;
  commune: string;
  site: string;
  subscription_plan: string;
  created_at: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  role: SupplierRole;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  wilaya: string | null;
  registration_number: string | null;
  active: boolean;
  created_at: string;
}

export interface ProductRow {
  id: string;
  trade_name: string;
  category: ProductCategory;
  active_substance: string | null;
  teneur_ma: string | null;
  teneur_ma_unit: string | null;
  formulation: string | null;
  famille_chimique: string | null;
  dose: string | null;
  cible: string | null;
  dose_unit: string | null;
  dar: number | null;
  unit: string;
  price_dzd: number | null;
  stock_initial_2024: number;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface RegionRow {
  id: string;
  name: string;
  parent_id: string | null;
  area_hectares: number | null;
  crop_type: string | null;
  variete: string | null;
  culture_type: CultureType | null;
  color: string | null;
  center: [number, number] | null;
  boundary: [number, number][] | null;
  site: string | null;
  created_at: string;
}

export interface MovementRow {
  id: string;
  date: string;
  product_id: string;
  category: ProductCategory;
  movement_type: MovementType;
  quantity: number;
  culture: CultureType | null;
  site_id: string | null;
  site_name: string | null;
  details_site: string | null;
  supplier_id: string | null;
  distributor_id: string | null;
  observations: string | null;
  n_units: number | null;
  p_units: number | null;
  k_units: number | null;
  ca_units: number | null;
  zinc_units: number | null;
  created_at: string;
}

export interface StockLevelRow {
  id: string;
  product_id: string;
  current_quantity: number;
  min_threshold: number;
  max_capacity: number;
  status: StockStatus;
  updated_at: string;
}

export interface OperatorRow {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  certification_number: string | null;
  identifier_code: string | null;
  active: boolean;
  total_treatments: number | null;
  last_treatment_date: string | null;
  created_at: string;
}

/** Treatments row — all FOR.PR6.003 fields as proper columns (post-migration 014) */
export interface TreatmentRow {
  id: string;
  site_id: string | null;
  site_name: string | null;
  parcelle_id: string | null;
  operator_id: string | null;
  operator_name: string | null;
  status: TreatmentStatus;
  type: string;
  planned_date: string;
  executed_date: string | null;
  area_treated_hectares: number | null;
  trees_count: number | null;
  weather_conditions: string | null;
  wind_speed: number | null;
  temperature: number | null;
  humidity: number | null;
  volume_bouillie: number | null;
  volume_bouillie_unit: string | null;
  total_cost_dzd: number | null;
  notes: string | null;
  // ── FOR.PR6.003 columns (migration 014) ──
  culture: string | null;
  variete: string | null;
  cible: string | null;
  mode_application: string | null;
  materiel: string | null;
  vitesse_kmh: number | null;
  pression_bar: number | null;
  diametre_pastilles_mm: number | null;
  date_reelle: string | null;
  heure_debut: string | null;
  heure_fin: string | null;
  quantite_utilisee: string | null;
  bouillon_citerne_l: number | null;
  nb_citernes: number | null;
  date_reentree: string | null;
  dar_jours: number | null;
  efficacite: string | null;
  visa_rt: string | null;
  created_at: string;
}

export interface TreatmentProductRow {
  id: string;
  treatment_id: string;
  product_id: string;
  quantity_used: number | null;
  unit: string;
  dose_per_hectare: number | null;
}

export interface AlertRow {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  related_id: string | null;
  acknowledged: boolean;
  timestamp: string;
  created_at: string;
}

// ── Join types (Supabase relational selects) ───────────────────────────────

export interface MovementWithProduct extends MovementRow {
  products: Pick<ProductRow, "trade_name" | "category" | "active_substance" | "unit" | "stock_initial_2024"> | null;
}

export interface StockLevelWithProduct extends StockLevelRow {
  products: Pick<ProductRow, "trade_name" | "category" | "active_substance" | "unit" | "stock_initial_2024" | "formulation" | "teneur_ma" | "teneur_ma_unit" | "famille_chimique"> | null;
}

export interface TreatmentWithProducts extends TreatmentRow {
  treatment_products: Array<TreatmentProductRow & {
    products: Pick<ProductRow, "trade_name" | "unit"> | null;
  }>;
}

// ── Domain models (what the UI works with) ─────────────────────────────────

export interface Product {
  id: string;
  tradeName: string;
  category: ProductCategory;
  activeSubstance: string;
  teneurMA: string;
  teneurMAUnit: string;
  formulation: string;
  familleChimique: string;
  dose: string;
  cible: string[];
  doseUnit: string;
  dar: number | null;
  unit: string;
  priceDzd: number;
  stockInitial2024: number;
  expiryDate: string;
  notes: string;
}

export interface Supplier {
  id: string;
  name: string;
  role: SupplierRole;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  wilaya: string | null;
  registrationNumber: string | null;
  active: boolean;
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
  status: StockStatus;
  expiryDate: string;
  stockInitial: number;
}

export interface Movement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  category: ProductCategory | string;
  movementType: string;
  type: string;
  movementCategory: string;
  quantity: number;
  culture: CultureType | null;
  siteId: string | null;
  siteName: string | null;
  detailsSite: string | null;
  supplierId: string | null;
  distributorId: string | null;
  observations: string | null;
  unit: string;
  stockInitial: number | null;
  nUnits: number | null;
  pUnits: number | null;
  kUnits: number | null;
  caUnits: number | null;
  zincUnits: number | null;
}

export interface TreatmentProduct {
  productId: string;
  productName: string;
  quantityUsed: number | null;
  unit: string;
  dosePerHectare: number | null;
}

export interface Treatment {
  id: string;
  siteId: string | null;
  parcelleId: string | null;
  parcelleName: string;
  sousParcelleName: string;
  operatorId: string | null;
  operatorName: string;
  status: TreatmentStatus;
  type: string;
  plannedDate: string;
  executedDate: string | null;
  areaTreatedHectares: number;
  treesCount: number | null;
  weatherConditions: string | null;
  windSpeed: number | null;
  temperature: number | null;
  humidity: number | null;
  volumeBouillie: number | null;
  volumeBouillieUnit: string | null;
  notes: string | null;
  totalCostDzd: number;
  products: TreatmentProduct[];
  // FOR.PR6.003 — now proper DB columns
  culture: string;
  variete: string;
  cible: string;
  modeApplication: string;
  materiel: string;
  vitesseKmh: number | null;
  pressionBar: number | null;
  diametrePastillesMm: number | null;
  dateReelle: string | null;
  heureDebut: string | null;
  heureFin: string | null;
  quantiteUtilisee: string;
  bouillonCiterneL: number | null;
  nbCiternes: number | null;
  dateReentree: string | null;
  darJours: number | null;
  efficacite: string;
  visaRt: string;
}

export interface Operator {
  id: string;
  name: string;
  fullName: string;
  identifierCode: string;
  role: string;
  phone: string | null;
  certificationNumber: string | null;
  active: boolean;
  totalTreatments: number;
  lastTreatmentDate: string | null;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  relatedId: string | null;
  acknowledged: boolean;
  timestamp: string;
}

// ── Generic result wrapper ─────────────────────────────────────────────────

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type DatabaseTable = keyof Database["public"]["Tables"];

export interface Database {
  public: {
    Tables: {
      exploitations: { Row: ExploitationRow; Insert: Omit<ExploitationRow, "id" | "created_at">; Update: Partial<Omit<ExploitationRow, "id" | "created_at">> };
      suppliers: { Row: SupplierRow; Insert: Omit<SupplierRow, "id" | "created_at">; Update: Partial<Omit<SupplierRow, "id" | "created_at">> };
      products: { Row: ProductRow; Insert: Omit<ProductRow, "id" | "created_at">; Update: Partial<Omit<ProductRow, "id" | "created_at">> };
      regions: { Row: RegionRow; Insert: Omit<RegionRow, "id" | "created_at">; Update: Partial<Omit<RegionRow, "id" | "created_at">> };
      movements: { Row: MovementRow; Insert: Omit<MovementRow, "id" | "created_at">; Update: Partial<Omit<MovementRow, "id" | "created_at">> };
      stock_levels: { Row: StockLevelRow; Insert: Omit<StockLevelRow, "id" | "updated_at">; Update: Partial<Omit<StockLevelRow, "id" | "updated_at">> };
      operators: { Row: OperatorRow; Insert: Omit<OperatorRow, "id" | "created_at">; Update: Partial<Omit<OperatorRow, "id" | "created_at">> };
      treatments: { Row: TreatmentRow; Insert: Omit<TreatmentRow, "id" | "created_at">; Update: Partial<Omit<TreatmentRow, "id" | "created_at">> };
      treatment_products: { Row: TreatmentProductRow; Insert: Omit<TreatmentProductRow, "id">; Update: Partial<Omit<TreatmentProductRow, "id">> };
      alerts: { Row: AlertRow; Insert: Omit<AlertRow, "id" | "created_at">; Update: Partial<Omit<AlertRow, "id" | "created_at">> };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      product_category: ProductCategory;
      culture_type: CultureType;
      movement_type: MovementType;
      supplier_role: SupplierRole;
      treatment_status: TreatmentStatus;
      alert_severity: AlertSeverity;
      alert_type: AlertType;
    };
  };
}
