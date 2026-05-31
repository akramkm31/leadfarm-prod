-- ═══════════════════════════════════════════════════════════════
-- ADR-15 — Identité parcelle canonique
-- UI + traitements : `regions` (même UUID)
-- MCD traçabilité (plantations) : `parcelles` miroir synchronisé
-- ═══════════════════════════════════════════════════════════════

-- Colonnes géo/métier sur regions (si schéma minimal 001)
ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES regions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS area_hectares NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS crop_type TEXT,
  ADD COLUMN IF NOT EXISTS variete TEXT,
  ADD COLUMN IF NOT EXISTS culture_type TEXT DEFAULT 'arboriculture',
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS center JSONB,
  ADD COLUMN IF NOT EXISTS boundary JSONB,
  ADD COLUMN IF NOT EXISTS site TEXT;

CREATE INDEX IF NOT EXISTS idx_regions_parent ON regions(parent_id);

-- Exploitation par défaut pour backfill
INSERT INTO exploitations (id, nom, wilaya, commune)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Domaine Khelifa',
  'Sidi Bel Abbès',
  'Ténira'
)
ON CONFLICT (id) DO NOTHING;

-- Miroir parcelles MCD ← regions (même id = lien stable)
INSERT INTO parcelles (
  id,
  exploitation_id,
  code_parcelle,
  nom,
  surface_ha,
  centroide_lat,
  centroide_lng,
  geojson,
  culture_actuelle,
  variete,
  statut
)
SELECT
  r.id,
  COALESCE(
    (SELECT id FROM exploitations ORDER BY created_at LIMIT 1),
    'a0000000-0000-4000-8000-000000000001'::uuid
  ),
  LEFT(REGEXP_REPLACE(COALESCE(r.name, r.id::text), '[^A-Za-z0-9_-]', '_', 'g'), 32),
  COALESCE(r.name, 'Parcelle'),
  COALESCE(r.area_hectares, 0)::numeric(10,4),
  CASE
    WHEN r.center IS NOT NULL AND jsonb_typeof(r.center) = 'array' AND jsonb_array_length(r.center) >= 2
    THEN (r.center->>0)::double precision
    ELSE NULL
  END,
  CASE
    WHEN r.center IS NOT NULL AND jsonb_typeof(r.center) = 'array' AND jsonb_array_length(r.center) >= 2
    THEN (r.center->>1)::double precision
    ELSE NULL
  END,
  CASE WHEN r.boundary IS NOT NULL THEN jsonb_build_object('type', 'Polygon', 'coordinates', jsonb_build_array(r.boundary)) ELSE NULL END,
  r.crop_type,
  r.variete,
  'active'
FROM regions r
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  surface_ha = EXCLUDED.surface_ha,
  centroide_lat = EXCLUDED.centroide_lat,
  centroide_lng = EXCLUDED.centroide_lng,
  geojson = EXCLUDED.geojson,
  culture_actuelle = EXCLUDED.culture_actuelle,
  variete = EXCLUDED.variete;

-- Aligner traitements.site_name → parcelle_id quand possible
UPDATE treatments t
SET parcelle_id = r.id
FROM regions r
WHERE t.parcelle_id IS NULL
  AND t.site_name IS NOT NULL
  AND LOWER(TRIM(t.site_name)) = LOWER(TRIM(r.name));

COMMENT ON TABLE regions IS 'ADR-15: source canonique UI parcelles (id partagé avec parcelles MCD)';

CREATE OR REPLACE VIEW v_parcelle_canonique AS
SELECT
  r.id,
  r.name AS nom_ui,
  p.nom AS nom_mcd,
  p.code_parcelle,
  p.surface_ha,
  p.exploitation_id,
  r.parent_id,
  r.area_hectares,
  r.crop_type,
  r.variete,
  r.culture_type,
  r.color,
  r.center,
  r.boundary,
  r.site,
  r.created_at
FROM regions r
LEFT JOIN parcelles p ON p.id = r.id;
