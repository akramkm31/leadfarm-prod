-- IoT execution fields on canonical treatments table + GPS points link
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS start_lat DOUBLE PRECISION;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS start_lng DOUBLE PRECISION;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS total_volume_l NUMERIC(10,2);
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS avg_dose_ha NUMERIC(8,3);
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS distance_m NUMERIC(10,2);
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS area_covered_ha NUMERIC(8,4);
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS dar_date_recolte_autorisee DATE;

CREATE INDEX IF NOT EXISTS idx_treatments_device_status ON treatments(device_id, status)
  WHERE device_id IS NOT NULL;

ALTER TABLE traitement_points ADD COLUMN IF NOT EXISTS treatment_id UUID
  REFERENCES treatments(id) ON DELETE CASCADE;

ALTER TABLE traitement_points ALTER COLUMN traitement_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_traitement_points_treatment_id ON traitement_points(treatment_id);
