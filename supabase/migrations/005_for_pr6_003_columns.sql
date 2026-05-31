-- ═══════════════════════════════════════════════════════════════
-- FOR.PR6.003 — Colonnes pour l Ordre de Traitement
-- Ajoute les champs nécessaires au template du formulaire officiel
-- ═══════════════════════════════════════════════════════════════

-- Ajouter les colonnes a la table "treatments" (utilisée par l app)
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

-- Table de détail des produits pour le FOR.PR6.003
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

-- RLS
ALTER TABLE treatment_detail_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "tdp_own_exploitation" ON treatment_detail_products
  USING (treatment_id IN (
    SELECT id FROM treatments WHERE parcelle_id IN (
      SELECT id FROM parcelles WHERE exploitation_id IN (
        SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  ));
