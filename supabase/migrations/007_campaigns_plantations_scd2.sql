-- ═══════════════════════════════════════════════════════════════
-- Phase C+D — Campagnes, plantations (SCD2-ready), lien parcelles
-- Alignement avec modèle métier traçabilité (sans casser l'existant)
-- ═══════════════════════════════════════════════════════════════

-- Colonne manquante pour jointures parcelle ↔ traitements (si pas déjà créée)
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS parcelle_id UUID REFERENCES parcelles(id) ON DELETE SET NULL;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS device_id TEXT;
CREATE INDEX IF NOT EXISTS idx_treatments_parcelle_id ON treatments(parcelle_id);
CREATE INDEX IF NOT EXISTS idx_treatments_device_id ON treatments(device_id);

-- ── CAMPAGNES (équivalent CAMPAGNE du MCD, liée à l'exploitation)
CREATE TABLE IF NOT EXISTS campagnes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id UUID NOT NULL REFERENCES exploitations(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  date_debut DATE,
  date_fin DATE,
  statut TEXT DEFAULT 'en_cours',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campagnes_exploitation ON campagnes(exploitation_id);

-- ── PLANTATIONS — SCD2 : plusieurs lignes par lineage_id (historique)
CREATE TABLE IF NOT EXISTS plantations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lineage_id UUID NOT NULL DEFAULT gen_random_uuid(),
  parcelle_id UUID NOT NULL REFERENCES parcelles(id) ON DELETE CASCADE,
  campagne_id UUID REFERENCES campagnes(id) ON DELETE SET NULL,
  type_culture TEXT,
  variete_culture TEXT,
  nombre_plants INTEGER,
  date_plantation DATE,
  date_debut_validite TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_fin_validite TIMESTAMPTZ,
  est_actuel BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  action_historique TEXT CHECK (action_historique IS NULL OR action_historique IN ('INSERT', 'UPDATE', 'DELETE')),
  modifie_par UUID REFERENCES auth.users(id),
  date_modification TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plantations_lineage ON plantations(lineage_id);
CREATE INDEX IF NOT EXISTS idx_plantations_parcelle ON plantations(parcelle_id);
CREATE INDEX IF NOT EXISTS idx_plantations_actuel ON plantations(est_actuel) WHERE est_actuel = TRUE;

-- Une seule version courante par lignée
CREATE UNIQUE INDEX IF NOT EXISTS uq_plantations_lineage_actuel
  ON plantations(lineage_id)
  WHERE est_actuel = TRUE;

CREATE OR REPLACE VIEW v_plantation_actuelle AS
SELECT *
FROM plantations
WHERE est_actuel = TRUE;

COMMENT ON TABLE plantations IS 'SCD2: nouvelle version = nouvelle ligne avec même lineage_id; clôturer l''ancienne (est_actuel = false)';

-- ── RLS
ALTER TABLE campagnes ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campagnes_own_exploitation ON campagnes;
CREATE POLICY campagnes_own_exploitation ON campagnes
  FOR ALL USING (
    exploitation_id IN (
      SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS plantations_own_parcelle ON plantations;
CREATE POLICY plantations_own_parcelle ON plantations
  FOR ALL USING (
    parcelle_id IN (
      SELECT id FROM parcelles WHERE exploitation_id IN (
        SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );
