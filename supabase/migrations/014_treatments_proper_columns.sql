-- ═══════════════════════════════════════════════════════════════
-- LeadFarm — Migration 014
-- Replace the ---FOR.PR6.003--- notes hack with proper columns
-- ═══════════════════════════════════════════════════════════════

-- 1. Add all missing FOR.PR6.003 columns as first-class citizens
ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS culture          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS variete          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cible            VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mode_application VARCHAR(100),
  ADD COLUMN IF NOT EXISTS materiel         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS vitesse_kmh      NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS pression_bar     NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS diametre_pastilles_mm NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS date_reelle      DATE,
  ADD COLUMN IF NOT EXISTS heure_debut      TIME,
  ADD COLUMN IF NOT EXISTS heure_fin        TIME,
  ADD COLUMN IF NOT EXISTS quantite_utilisee VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bouillon_citerne_l NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS nb_citernes      INT,
  ADD COLUMN IF NOT EXISTS date_reentree    DATE,
  ADD COLUMN IF NOT EXISTS dar_jours        INT,
  ADD COLUMN IF NOT EXISTS efficacite       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS visa_rt          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS parcelle_id      UUID REFERENCES regions(id) ON DELETE SET NULL;

-- 2. Backfill from the JSON embedded in notes
-- This extracts all stored FOR.PR6.003 data into proper columns
UPDATE treatments
SET
  culture = (
    CASE WHEN notes LIKE '%FOR.PR6.003%' THEN
      (regexp_match(notes, '"culture"\s*:\s*"([^"]*)"'))[1]
    END
  ),
  variete = (
    CASE WHEN notes LIKE '%FOR.PR6.003%' THEN
      (regexp_match(notes, '"variete"\s*:\s*"([^"]*)"'))[1]
    END
  ),
  cible = (
    CASE WHEN notes LIKE '%FOR.PR6.003%' THEN
      (regexp_match(notes, '"cible"\s*:\s*"([^"]*)"'))[1]
    END
  ),
  mode_application = (
    CASE WHEN notes LIKE '%FOR.PR6.003%' THEN
      (regexp_match(notes, '"mode_application"\s*:\s*"([^"]*)"'))[1]
    END
  ),
  materiel = (
    CASE WHEN notes LIKE '%FOR.PR6.003%' THEN
      (regexp_match(notes, '"materiel"\s*:\s*"([^"]*)"'))[1]
    END
  ),
  dar_jours = (
    CASE WHEN notes LIKE '%FOR.PR6.003%' THEN
      ((regexp_match(notes, '"dar_jours"\s*:\s*(\d+)'))[1])::int
    END
  ),
  efficacite = (
    CASE WHEN notes LIKE '%FOR.PR6.003%' THEN
      (regexp_match(notes, '"efficacite"\s*:\s*"([^"]*)"'))[1]
    END
  )
WHERE notes IS NOT NULL AND notes LIKE '%FOR.PR6.003%';

-- 3. Clean up old notes column: remove embedded JSON sentinel
-- Keep any human-written notes prefix before the sentinel
UPDATE treatments
SET notes = (
  CASE
    WHEN notes LIKE '%---FOR.PR6.003---%' THEN
      NULLIF(trim(split_part(notes, '---FOR.PR6.003---', 1)), '')
    ELSE notes
  END
)
WHERE notes IS NOT NULL AND notes LIKE '%FOR.PR6.003%';

-- 4. Add indexes for common treatment queries
CREATE INDEX IF NOT EXISTS idx_treatments_planned_date ON treatments(planned_date DESC);
CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status);
CREATE INDEX IF NOT EXISTS idx_treatments_culture ON treatments(culture);
CREATE INDEX IF NOT EXISTS idx_treatments_site_name ON treatments(site_name);

COMMENT ON COLUMN treatments.culture IS 'Type de culture traitée (ex: Agrumes, Pommes)';
COMMENT ON COLUMN treatments.variete IS 'Variété spécifique (ex: Clementine Nour)';
COMMENT ON COLUMN treatments.cible IS 'Ravageur ou maladie ciblé (ex: Botrytis)';
COMMENT ON COLUMN treatments.dar_jours IS 'Délai Avant Récolte en jours (contrainte réglementaire)';
COMMENT ON COLUMN treatments.date_reentree IS 'Date de réentrée au champ autorisée';
