-- =============================================================
-- 031 — WhatsApp field-log ingestion (consultant ↔ engineers)
-- Raw message + AI-extracted structured fields (Claude).
-- Categories: traitement | fertigation | sortie | entree |
--             bon_commande | statut | travaux | info | autre
-- =============================================================
CREATE TABLE IF NOT EXISTS lf_wa_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_hash      text UNIQUE NOT NULL,
  raw_date         text,
  sent_at          timestamptz,
  author           text,
  body             text NOT NULL,
  category         text NOT NULL DEFAULT 'info',
  op_date          date,
  zone             text,
  culture          text,
  variete          text,
  ph               numeric,
  volume_bouillie  numeric,
  methode          text,
  effectif         integer,
  statut           text,
  products         jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary          text,
  extracted        jsonb,
  exploitation_id  uuid NOT NULL DEFAULT 'a0000000-0000-4000-8000-000000000001'
                     REFERENCES exploitations(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lf_wa_category ON lf_wa_messages (category);
CREATE INDEX IF NOT EXISTS idx_lf_wa_op_date  ON lf_wa_messages (op_date);
CREATE INDEX IF NOT EXISTS idx_lf_wa_sent_at  ON lf_wa_messages (sent_at);

ALTER TABLE lf_wa_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lf_wa_all ON lf_wa_messages;
CREATE POLICY lf_wa_all ON lf_wa_messages FOR ALL USING (true) WITH CHECK (true);

-- Raw-SQL tables don't auto-grant to API roles.
GRANT SELECT, INSERT, UPDATE, DELETE ON lf_wa_messages TO anon, authenticated;
