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

export type CultureType = "a_pepins" | "a_noyau" | "vigne" | "agrumes" | "autre";

export type MovementType = "transfert" | "entree" | "retour" | "sortie";

export type SupplierRole = "fabricant" | "distributeur";

export type TreatmentStatus = "planned" | "in_progress" | "completed" | "cancelled";

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

export interface Database {
  public: {
    Tables: {
      exploitations: {
        Row: {
          id: string;
          name: string;
          registration_number: string;
          wilaya: string;
          commune: string;
          site: string;
          subscription_plan: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["exploitations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["exploitations"]["Insert"]>;
      };
      suppliers: {
        Row: {
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
        };
        Insert: Omit<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          trade_name: string;
          category: ProductCategory;
          active_substance: string | null;
          teneur_ma: string | null;
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
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      regions: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["regions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["regions"]["Insert"]>;
      };
      zones: {
        Row: {
          id: string;
          name: string;
          region_id: string;
          culture_type: CultureType;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["zones"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["zones"]["Insert"]>;
      };
      sites: {
        Row: {
          id: string;
          name: string;
          zone_id: string;
          details: string | null;
          area_hectares: number | null;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sites"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["sites"]["Insert"]>;
      };
      movements: {
        Row: {
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
        };
        Insert: Omit<Database["public"]["Tables"]["movements"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["movements"]["Insert"]>;
      };
      stock_levels: {
        Row: {
          id: string;
          product_id: string;
          current_quantity: number;
          min_threshold: number;
          max_capacity: number;
          status: "ok" | "low" | "critical" | "overstock" | "negative";
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["stock_levels"]["Row"], "id" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["stock_levels"]["Insert"]>;
      };
      operators: {
        Row: {
          id: string;
          name: string;
          role: string;
          phone: string | null;
          certification_number: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["operators"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["operators"]["Insert"]>;
      };
      treatments: {
        Row: {
          id: string;
          site_id: string | null;
          site_name: string | null;
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
          notes: string | null;
          total_cost_dzd: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["treatments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["treatments"]["Insert"]>;
      };
      treatment_products: {
        Row: {
          id: string;
          treatment_id: string;
          product_id: string;
          quantity_used: number;
          unit: string;
          dose_per_hectare: number | null;
        };
        Insert: Omit<Database["public"]["Tables"]["treatment_products"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["treatment_products"]["Insert"]>;
      };
      alerts: {
        Row: {
          id: string;
          type: AlertType;
          severity: AlertSeverity;
          message: string;
          related_id: string | null;
          acknowledged: boolean;
          timestamp: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["alerts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["alerts"]["Insert"]>;
      };
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
