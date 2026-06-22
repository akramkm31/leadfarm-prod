CREATE TABLE IF NOT EXISTS trace_verifications (
  hash TEXT PRIMARY KEY,
  treatment_id UUID REFERENCES treatments(id) ON DELETE CASCADE,
  exploitation_id UUID REFERENCES exploitations(id) ON DELETE SET NULL,
  site_name TEXT,
  status TEXT,
  planned_date DATE,
  executed_date DATE,
  culture TEXT,
  cible TEXT,
  products_summary JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trace_verifications_treatment ON trace_verifications(treatment_id);

ALTER TABLE trace_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trace_verifications_public_read ON trace_verifications;
CREATE POLICY trace_verifications_public_read ON trace_verifications
  FOR SELECT USING (true);
