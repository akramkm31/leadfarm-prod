-- ============================================================
-- LeadFarm — Full Database Schema
-- Gestion de Stock Phytosanitaire SBA 2025
-- ============================================================

-- ENUMS
CREATE TYPE product_category AS ENUM (
  'fongicide', 'insecticide', 'herbicide', 'engrais', 'adjuvant', 'acaricide',
  'acide_nitrique', 'acide_sulfurique', 'acide_phosphorique', 'acide_humique',
  'matiere_organique', 'fer', 'drmx', 'autre'
);

CREATE TYPE culture_type AS ENUM ('a_pepins', 'a_noyau', 'vigne', 'agrumes', 'autre');

CREATE TYPE movement_type AS ENUM ('transfert', 'entree', 'retour', 'sortie');

CREATE TYPE supplier_role AS ENUM ('fabricant', 'distributeur');

CREATE TYPE treatment_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');

CREATE TYPE alert_type AS ENUM (
  'low_stock', 'critical_stock', 'stock_expiry', 'treatment_overdue',
  'parcel_untreated', 'dar_violation', 'transfer_pending', 'negative_stock'
);

CREATE TYPE stock_status AS ENUM ('ok', 'low', 'critical', 'overstock', 'negative');

-- ============================================================
-- EXPLOITATIONS
-- ============================================================
CREATE TABLE exploitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration_number TEXT,
  wilaya TEXT NOT NULL,
  commune TEXT,
  site TEXT,
  subscription_plan TEXT DEFAULT 'pro',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SUPPLIERS (Fournisseurs + Distributeurs)
-- ============================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  role supplier_role NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  wilaya TEXT,
  registration_number TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRODUCTS (Produits phytosanitaires, engrais, acides, etc.)
-- ============================================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_name TEXT NOT NULL,
  category product_category NOT NULL DEFAULT 'autre',
  active_substance TEXT,
  teneur_ma TEXT,
  formulation TEXT,
  famille_chimique TEXT,
  dose TEXT,
  cible TEXT,
  dose_unit TEXT DEFAULT 'L',
  dar INTEGER,
  unit TEXT DEFAULT 'L',
  price_dzd NUMERIC,
  stock_initial_2024 NUMERIC DEFAULT 0,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_trade_name ON products(trade_name);

-- ============================================================
-- REGIONS → ZONES → SITES (Hierarchical parcelle system)
-- ============================================================
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
  culture_type culture_type NOT NULL DEFAULT 'autre',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_zones_region ON zones(region_id);

CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  details TEXT,
  area_hectares NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sites_zone ON sites(zone_id);

-- ============================================================
-- MOVEMENTS (Main stock journal — 6915+ rows)
-- ============================================================
CREATE TABLE movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  category product_category NOT NULL DEFAULT 'autre',
  movement_type movement_type NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  culture culture_type,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  site_name TEXT,
  details_site TEXT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  distributor_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  observations TEXT,
  n_units NUMERIC,
  p_units NUMERIC,
  k_units NUMERIC,
  ca_units NUMERIC,
  zinc_units NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_movements_date ON movements(date);
CREATE INDEX idx_movements_product ON movements(product_id);
CREATE INDEX idx_movements_category ON movements(category);
CREATE INDEX idx_movements_type ON movements(movement_type);
CREATE INDEX idx_movements_culture ON movements(culture);
CREATE INDEX idx_movements_site ON movements(site_name);

-- ============================================================
-- STOCK LEVELS (Computed from movements)
-- ============================================================
CREATE TABLE stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  min_threshold NUMERIC DEFAULT 0,
  max_capacity NUMERIC DEFAULT 0,
  status stock_status DEFAULT 'ok',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stock_product ON stock_levels(product_id);

-- ============================================================
-- OPERATORS
-- ============================================================
CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT DEFAULT 'operateur',
  phone TEXT,
  certification_number TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TREATMENTS
-- ============================================================
CREATE TABLE treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  site_name TEXT,
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  operator_name TEXT,
  status treatment_status DEFAULT 'planned',
  type TEXT DEFAULT 'pulverisation',
  planned_date DATE NOT NULL,
  executed_date DATE,
  area_treated_hectares NUMERIC,
  trees_count INTEGER,
  weather_conditions TEXT,
  wind_speed NUMERIC,
  temperature NUMERIC,
  humidity NUMERIC,
  volume_bouillie NUMERIC,
  volume_bouillie_unit TEXT DEFAULT 'L',
  notes TEXT,
  total_cost_dzd NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_treatments_status ON treatments(status);
CREATE INDEX idx_treatments_date ON treatments(planned_date);

CREATE TABLE treatment_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID REFERENCES treatments(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  quantity_used NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'L',
  dose_per_hectare NUMERIC
);

CREATE INDEX idx_tp_treatment ON treatment_products(treatment_id);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type alert_type NOT NULL,
  severity alert_severity DEFAULT 'info',
  message TEXT NOT NULL,
  related_id TEXT,
  acknowledged BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alerts_ack ON alerts(acknowledged);
CREATE INDEX idx_alerts_severity ON alerts(severity);

-- ============================================================
-- VIEWS for common queries
-- ============================================================

-- Stock overview: join products + stock_levels
CREATE VIEW v_stock_overview AS
SELECT
  p.id AS product_id,
  p.trade_name,
  p.category,
  p.active_substance,
  p.teneur_ma,
  p.formulation,
  p.famille_chimique,
  p.unit,
  p.stock_initial_2024,
  COALESCE(sl.current_quantity, 0) AS current_quantity,
  COALESCE(sl.min_threshold, 0) AS min_threshold,
  COALESCE(sl.max_capacity, 0) AS max_capacity,
  COALESCE(sl.status, 'ok') AS status,
  sl.updated_at
FROM products p
LEFT JOIN stock_levels sl ON sl.product_id = p.id;

-- Movement summary per product
CREATE VIEW v_product_movements AS
SELECT
  p.id AS product_id,
  p.trade_name,
  p.category,
  COALESCE(SUM(CASE WHEN m.movement_type = 'entree' THEN m.quantity ELSE 0 END), 0) AS total_entries,
  COALESCE(SUM(CASE WHEN m.movement_type = 'sortie' THEN m.quantity ELSE 0 END), 0) AS total_exits,
  COALESCE(SUM(CASE WHEN m.movement_type = 'retour' THEN m.quantity ELSE 0 END), 0) AS total_returns,
  COALESCE(SUM(CASE WHEN m.movement_type = 'transfert' THEN m.quantity ELSE 0 END), 0) AS total_transfers,
  COUNT(m.id) AS movement_count
FROM products p
LEFT JOIN movements m ON m.product_id = p.id
GROUP BY p.id, p.trade_name, p.category;

-- Consumption per site
CREATE VIEW v_site_consumption AS
SELECT
  m.site_name,
  m.culture,
  p.trade_name,
  p.category,
  SUM(m.quantity) AS total_quantity,
  COUNT(*) AS movement_count
FROM movements m
JOIN products p ON p.id = m.product_id
WHERE m.movement_type = 'sortie'
GROUP BY m.site_name, m.culture, p.trade_name, p.category;

-- ============================================================
-- FUNCTION: Recalculate stock level for a product
-- ============================================================
CREATE OR REPLACE FUNCTION recalc_stock(p_product_id UUID)
RETURNS void AS $$
DECLARE
  v_initial NUMERIC;
  v_entries NUMERIC;
  v_returns NUMERIC;
  v_exits NUMERIC;
  v_transfers NUMERIC;
  v_current NUMERIC;
  v_min NUMERIC;
  v_max NUMERIC;
  v_status stock_status;
BEGIN
  SELECT COALESCE(stock_initial_2024, 0) INTO v_initial FROM products WHERE id = p_product_id;

  SELECT
    COALESCE(SUM(CASE WHEN movement_type = 'entree' THEN quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'retour' THEN quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'sortie' THEN quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'transfert' THEN quantity ELSE 0 END), 0)
  INTO v_entries, v_returns, v_exits, v_transfers
  FROM movements WHERE product_id = p_product_id;

  v_current := v_initial + v_entries + v_returns - v_exits - v_transfers;

  SELECT COALESCE(min_threshold, 0), COALESCE(max_capacity, 9999)
  INTO v_min, v_max
  FROM stock_levels WHERE product_id = p_product_id;

  IF v_current < 0 THEN v_status := 'negative';
  ELSIF v_current <= v_min * 0.3 THEN v_status := 'critical';
  ELSIF v_current <= v_min THEN v_status := 'low';
  ELSIF v_current > v_max THEN v_status := 'overstock';
  ELSE v_status := 'ok';
  END IF;

  INSERT INTO stock_levels (product_id, current_quantity, status, updated_at)
  VALUES (p_product_id, v_current, v_status, now())
  ON CONFLICT (product_id)
  DO UPDATE SET current_quantity = v_current, status = v_status, updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: Auto-recalculate stock after movement insert/update/delete
-- ============================================================
CREATE OR REPLACE FUNCTION trg_recalc_stock()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_stock(OLD.product_id);
    RETURN OLD;
  ELSE
    PERFORM recalc_stock(NEW.product_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER movement_stock_update
AFTER INSERT OR UPDATE OR DELETE ON movements
FOR EACH ROW EXECUTE FUNCTION trg_recalc_stock();

-- ============================================================
-- TRIGGER: Auto-generate alerts for negative/low stock
-- ============================================================
CREATE OR REPLACE FUNCTION trg_stock_alerts()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'negative' THEN
    INSERT INTO alerts (type, severity, message, related_id)
    VALUES (
      'negative_stock', 'critical',
      'Stock négatif détecté pour ' || (SELECT trade_name FROM products WHERE id = NEW.product_id),
      NEW.product_id::TEXT
    );
  ELSIF NEW.status = 'critical' THEN
    INSERT INTO alerts (type, severity, message, related_id)
    VALUES (
      'critical_stock', 'critical',
      'Stock critique pour ' || (SELECT trade_name FROM products WHERE id = NEW.product_id),
      NEW.product_id::TEXT
    );
  ELSIF NEW.status = 'low' THEN
    INSERT INTO alerts (type, severity, message, related_id)
    VALUES (
      'low_stock', 'warning',
      'Stock bas pour ' || (SELECT trade_name FROM products WHERE id = NEW.product_id),
      NEW.product_id::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_level_alert
AFTER INSERT OR UPDATE ON stock_levels
FOR EACH ROW EXECUTE FUNCTION trg_stock_alerts();

-- ============================================================
-- RLS (Row Level Security) — ready for multi-tenant
-- ============================================================
ALTER TABLE exploitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Allow all for anon (development — tighten for production)
CREATE POLICY "Allow all for anon" ON exploitations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON regions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON zones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON sites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON stock_levels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON operators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON treatments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON treatment_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON alerts FOR ALL USING (true) WITH CHECK (true);
