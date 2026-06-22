-- Alertes satellite automatiques (stress NDVI / NDWI)
CREATE TABLE IF NOT EXISTS satellite_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id UUID NOT NULL REFERENCES parcelles(id) ON DELETE CASCADE,
  type_alerte TEXT NOT NULL CHECK (
    type_alerte IN ('stress_hydrique', 'stress_vegetation', 'secheresse', 'couverture_nuage')
  ),
  severite TEXT NOT NULL CHECK (severite IN ('faible', 'moyen', 'critique')),
  date_analyse DATE NOT NULL,
  ndvi_valeur DOUBLE PRECISION,
  ndwi_valeur DOUBLE PRECISION,
  message TEXT NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parcelle_id, type_alerte, date_analyse)
);

CREATE INDEX IF NOT EXISTS idx_satellite_alerts_parcelle
  ON satellite_alerts(parcelle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_satellite_alerts_unread
  ON satellite_alerts(lu, created_at DESC)
  WHERE lu = FALSE;

ALTER TABLE satellite_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS satellite_alerts_own ON satellite_alerts;
CREATE POLICY satellite_alerts_own ON satellite_alerts
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

GRANT SELECT, INSERT, UPDATE, DELETE ON satellite_alerts TO authenticated;
