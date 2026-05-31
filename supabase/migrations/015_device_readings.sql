-- ─────────────────────────────────────────────────────────────
-- 015 : Lectures IoT ESP32 (device_readings) — aligné API /live
-- Table distincte de esp32_telemetry (004) pour POST /api/readings
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS device_readings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   TEXT NOT NULL,
  flow1       NUMERIC(8,3) NOT NULL DEFAULT 0,
  flow2       NUMERIC(8,3) NOT NULL DEFAULT 0,
  vol1        NUMERIC(10,3) NOT NULL DEFAULT 0,
  vol2        NUMERIC(10,3) NOT NULL DEFAULT 0,
  lat         DOUBLE PRECISION NOT NULL DEFAULT 0,
  lon         DOUBLE PRECISION NOT NULL DEFAULT 0,
  speed       NUMERIC(6,2) NOT NULL DEFAULT 0,
  hdop        NUMERIC(5,2) NOT NULL DEFAULT 99.9,
  sats        INTEGER NOT NULL DEFAULT 0,
  area_m2     NUMERIC(12,2) NOT NULL DEFAULT 0,
  timestamp   TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (device_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_device_readings_device_created
  ON device_readings (device_id, created_at DESC);

ALTER TABLE device_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "device_readings_select_authenticated" ON device_readings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "device_readings_insert_service" ON device_readings
  FOR INSERT TO authenticated
  WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE device_readings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
