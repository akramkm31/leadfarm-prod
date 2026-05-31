-- ─────────────────────────────────────────────────────────────
-- 004 : Table télémétrie ESP32 + fertigations + checklist stockage
-- ─────────────────────────────────────────────────────────────

-- ═══ esp32_telemetry ═════════════════════════════════════════
CREATE TABLE IF NOT EXISTS esp32_telemetry (
  id                BIGSERIAL PRIMARY KEY,
  device_id         TEXT NOT NULL DEFAULT 'ESP32-001',
  timestamp         TIMESTAMPTZ DEFAULT now(),
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  speed_kmh         NUMERIC(6,2) DEFAULT 0,
  heading           NUMERIC(5,2),
  satellites        INTEGER DEFAULT 0,
  hdop              NUMERIC(5,2) DEFAULT 99,
  vol1              NUMERIC(8,3) DEFAULT 0,
  vol2              NUMERIC(8,3) DEFAULT 0,
  debit1            NUMERIC(8,3) DEFAULT 0,
  debit2            NUMERIC(8,3) DEFAULT 0,
  volume_cumul      NUMERIC(10,3) DEFAULT 0,
  pression_bar      NUMERIC(6,3) DEFAULT 0,
  flow_rate_lpm     NUMERIC(8,3) DEFAULT 0,
  temperature_c     NUMERIC(5,2),
  humidity_pct      NUMERIC(5,2),
  wifi_rssi         INTEGER,
  battery_pct       NUMERIC(5,2) DEFAULT 100,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_esp32_telemetry_device_ts ON esp32_telemetry(device_id, created_at DESC);
ALTER TABLE esp32_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "own_exploitation_esp32" ON esp32_telemetry
  USING (device_id IN (
    SELECT device_id FROM traitements WHERE exploitation_id IN (
      SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
    )
  ));

-- Ajout à la publication Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE esp32_telemetry;

-- ═══ fertigations ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fertigations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id   UUID REFERENCES exploitations(id),
  parcelle_id       UUID REFERENCES parcelles(id),
  n_fertigation     TEXT NOT NULL,
  date_fertigation  DATE NOT NULL DEFAULT CURRENT_DATE,
  mode_application  TEXT,
  materiel          TEXT,
  pression_bar      NUMERIC(5,2),
  produits          JSONB NOT NULL DEFAULT '[]'::jsonb,
  visa_responsable  TEXT,
  pdf_url           TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fertigations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "own_exploitation_fertigations" ON fertigations
  USING (exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ═══ checklist_stockage ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS checklist_stockage (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id   UUID REFERENCES exploitations(id),
  reponses          JSONB NOT NULL DEFAULT '{}'::jsonb,
  score_pct         INTEGER,
  date_verification DATE DEFAULT CURRENT_DATE,
  verificateur_id   UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE checklist_stockage ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "own_exploitation_checklist_stockage" ON checklist_stockage
  USING (exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ═══ inventaires ═════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventaires (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id   UUID REFERENCES exploitations(id),
  date_debut        TIMESTAMPTZ DEFAULT now(),
  date_fin          TIMESTAMPTZ,
  stock_theorique   JSONB NOT NULL DEFAULT '[]'::jsonb,
  lignes            JSONB,
  status            TEXT DEFAULT 'en_cours',
  pv_pdf_url        TEXT,
  validateur_id     UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inventaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "own_exploitation_inventaires" ON inventaires
  USING (exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ═══ user_preferences ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id),
  langue             TEXT DEFAULT 'fr',
  notifications_email  BOOLEAN DEFAULT true,
  notifications_push   BOOLEAN DEFAULT true,
  notifications_sms    BOOLEAN DEFAULT false,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "own_user_preferences" ON user_preferences
  USING (user_id = auth.uid());
