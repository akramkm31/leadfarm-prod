-- FOR.PR6.003 columns + parcelle linkage (production was missing these)
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS culture TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS variete TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS cible TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS mode_application TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS materiel TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS vitesse_kmh REAL;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS pression_bar REAL;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS diametre_pastilles_mm REAL;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS date_reelle DATE;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS heure_debut TIME;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS heure_fin TIME;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS quantite_utilisee TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS bouillon_citerne_l REAL;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS nb_citernes INTEGER;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS date_reentree DATE;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS dar_jours INTEGER DEFAULT 0;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS efficacite TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS visa_rt TEXT;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS parcelle_id UUID REFERENCES parcelles(id) ON DELETE SET NULL;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS device_id TEXT;

CREATE INDEX IF NOT EXISTS idx_treatments_parcelle_id ON treatments(parcelle_id);
CREATE INDEX IF NOT EXISTS idx_treatments_culture ON treatments(culture);
CREATE INDEX IF NOT EXISTS idx_treatments_site_name ON treatments(site_name);

CREATE TABLE IF NOT EXISTS treatment_detail_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID REFERENCES treatments(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id),
  nom_commercial TEXT,
  matiere_active TEXT,
  dose_hl TEXT,
  quantite_sortir TEXT,
  dar_jours INTEGER DEFAULT 21,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tdp_treatment_id ON treatment_detail_products(treatment_id);

ALTER TABLE treatment_detail_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'treatment_detail_products'
      AND policyname = 'tdp_allow_all'
  ) THEN
    CREATE POLICY tdp_allow_all ON treatment_detail_products
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
