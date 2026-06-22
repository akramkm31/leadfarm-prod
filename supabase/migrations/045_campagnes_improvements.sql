-- 045_campagnes_improvements.sql
-- Campagnes: soft delete, description, couleur, status comment

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE campagnes
  ADD COLUMN IF NOT EXISTS description  TEXT,
  ADD COLUMN IF NOT EXISTS couleur      VARCHAR(7) DEFAULT '#00D4AA',
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ;

COMMENT ON COLUMN campagnes.description IS 'Annotations libres du responsable (max 500 chars)';
COMMENT ON COLUMN campagnes.couleur     IS 'Code hex couleur pour différenciation visuelle en UI';
COMMENT ON COLUMN campagnes.deleted_at  IS 'Soft delete — NULL = actif, non-NULL = archivé';

-- Overlap exclusion constraint
-- Prevents two active campaigns for the same exploitation from overlapping in time.
-- Requires both date_debut and date_fin to be NOT NULL; suspended/deleted campaigns are excluded.
-- Uncomment only after ensuring no existing rows have NULL dates or overlapping ranges:
--
-- ALTER TABLE campagnes ADD CONSTRAINT campagnes_no_overlap
--   EXCLUDE USING gist (
--     exploitation_id WITH =,
--     daterange(date_debut, date_fin, '[]') WITH &&
--   ) WHERE (statut != 'suspendu' AND deleted_at IS NULL);

NOTIFY pgrst, 'reload schema';
