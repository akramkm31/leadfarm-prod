-- Satellite indices storage (Sentinel-2 / CDSE ingest)
-- Safe to run if migration 019 was never applied on production.

CREATE TABLE IF NOT EXISTS donnees_satellite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id UUID NOT NULL REFERENCES parcelles(id) ON DELETE CASCADE,
  date_acquisition DATE NOT NULL,
  indice_ndvi DOUBLE PRECISION,
  indice_ndwi DOUBLE PRECISION,
  indice_evi DOUBLE PRECISION,
  indice_savi DOUBLE PRECISION,
  indice_ndre DOUBLE PRECISION,
  ndvi_min DOUBLE PRECISION,
  ndvi_max DOUBLE PRECISION,
  ndwi_min DOUBLE PRECISION,
  ndwi_max DOUBLE PRECISION,
  cloud_cover_pct DOUBLE PRECISION,
  source_satellite TEXT DEFAULT 'Sentinel-2 L2A (Copernicus CDSE)',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (parcelle_id, date_acquisition)
);

CREATE INDEX IF NOT EXISTS idx_donnees_satellite_parcelle
  ON donnees_satellite(parcelle_id, date_acquisition DESC);

ALTER TABLE donnees_satellite ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS donnees_satellite_own ON donnees_satellite;
CREATE POLICY donnees_satellite_own ON donnees_satellite
  FOR ALL
  USING (
    parcelle_id IN (
      SELECT id FROM parcelles
      WHERE exploitation_id IN (
        SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    parcelle_id IN (
      SELECT id FROM parcelles
      WHERE exploitation_id IN (
        SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON donnees_satellite TO authenticated;
