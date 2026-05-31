-- ═══════════════════════════════════════════════════════════════
-- LeadFarm — Complete Schema Migration v1.0
-- Groupe Lachhab · Sidi Bel Abbès · Arrêté ministériel n° 1275
-- ═══════════════════════════════════════════════════════════════

-- ── MODULE 1 : EXPLOITATIONS ET PARCELLES ────────────────────────

CREATE TABLE IF NOT EXISTS exploitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom          TEXT NOT NULL,
  wilaya       TEXT NOT NULL,
  commune      TEXT,
  surface_ha   NUMERIC(10,2),
  owner_id     UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parcelles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id   UUID REFERENCES exploitations(id) ON DELETE CASCADE,
  code_parcelle     TEXT NOT NULL,
  nom               TEXT NOT NULL,
  surface_ha        NUMERIC(10,4) NOT NULL,
  centroide_lat     DOUBLE PRECISION,
  centroide_lng     DOUBLE PRECISION,
  geojson           JSONB,
  culture_actuelle  TEXT,
  variete           TEXT,
  date_plantation   DATE,
  densite_plants_ha INTEGER,
  mode_irrigation   TEXT,
  type_sol          TEXT,
  ph_sol            NUMERIC(4,2),
  statut            TEXT DEFAULT 'active',
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── MODULE 2 : FOURNISSEURS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS fournisseurs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id UUID REFERENCES exploitations(id),
  nom             TEXT NOT NULL,
  contact         TEXT,
  adresse         TEXT,
  registre_com    TEXT,
  nif             TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── MODULE 2 : STOCK PHYTOSANITAIRE ─────────────────────────────

CREATE TABLE IF NOT EXISTS produits_ppp (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_commercial        TEXT NOT NULL,
  matiere_active        TEXT NOT NULL,
  pourcentage_ma        NUMERIC(5,2),
  formulation           TEXT,
  classification_tox    TEXT,
  phrases_rh            TEXT[],
  dar_par_culture       JSONB DEFAULT '{}',
  delai_reentre         INTEGER DEFAULT 0,
  pays_export_autorises TEXT[],
  homologue_inpv        BOOLEAN DEFAULT true,
  date_retrait_inpv     DATE,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lots_stock (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id   UUID REFERENCES exploitations(id),
  produit_id        UUID REFERENCES produits_ppp(id),
  numero_lot        TEXT NOT NULL,
  date_reception    DATE NOT NULL,
  date_peremption   DATE NOT NULL,
  quantite_initiale NUMERIC(10,3) NOT NULL,
  unite             TEXT NOT NULL,
  prix_unitaire_dzd NUMERIC(10,2),
  numero_facture    TEXT,
  fournisseur_id    UUID REFERENCES fournisseurs(id),
  photo_etiquette   TEXT,
  seuil_alerte_min  NUMERIC(10,3),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- Stock append-only — NEVER UPDATE OR DELETE
CREATE TABLE IF NOT EXISTS stock_movements (
  id              BIGSERIAL PRIMARY KEY,
  lot_id          UUID REFERENCES lots_stock(id),
  exploitation_id UUID REFERENCES exploitations(id),
  type_mvt        TEXT NOT NULL CHECK (type_mvt IN ('RECEPTION','SORTIE_TRAITEMENT','AJUSTEMENT','PEREMPTION','CORRECTION')),
  quantite        NUMERIC(10,3) NOT NULL,
  traitement_id   UUID,
  motif           TEXT,
  user_id         UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── MODULE 3 : TRAITEMENTS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS traitements (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id             UUID REFERENCES exploitations(id),
  parcelle_id                 UUID REFERENCES parcelles(id),
  device_id                   TEXT,
  type                        TEXT DEFAULT 'pulverisation',
  status                      TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','approved','in_progress','completed','evaluated','cancelled','en_cours','terminé')),

  -- Ordre
  cible_maladie               TEXT,
  cible_ravageur              TEXT,
  stade_phenologique          TEXT,
  produits                    JSONB NOT NULL DEFAULT '[]',
  volume_bouillie_l           NUMERIC(10,2),
  materiel                    JSONB,

  -- Planification
  date_prevue                 DATE,
  operateur_id                UUID REFERENCES auth.users(id),
  approbateur_id              UUID REFERENCES auth.users(id),
  date_approbation            TIMESTAMPTZ,
  notes                       TEXT,

  -- Exécution
  start_time                  TIMESTAMPTZ,
  end_time                    TIMESTAMPTZ,
  start_lat                   DOUBLE PRECISION,
  start_lng                   DOUBLE PRECISION,
  epi_confirme                BOOLEAN DEFAULT false,

  -- IoT stats
  volume_total_l              NUMERIC(10,2) DEFAULT 0,
  dose_reelle_l_ha            NUMERIC(8,3)  DEFAULT 0,
  surface_traitee_ha          NUMERIC(8,4)  DEFAULT 0,
  distance_m                  NUMERIC(10,2) DEFAULT 0,
  duration_seconds            INTEGER       DEFAULT 0,
  avg_dose_ha                 NUMERIC(8,3)  DEFAULT 0,
  area_covered_ha             NUMERIC(8,4)  DEFAULT 0,
  total_volume_l              NUMERIC(10,2) DEFAULT 0,

  -- DAR
  dar_date_reentre_parcelle   DATE,
  dar_date_recolte_autorisee  DATE,

  -- Évaluation
  score_efficacite            INTEGER CHECK (score_efficacite BETWEEN 1 AND 5),
  notes_evaluation            TEXT,

  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- GPS points (append-only)
CREATE TABLE IF NOT EXISTS traitement_points (
  id                BIGSERIAL PRIMARY KEY,
  traitement_id     UUID REFERENCES traitements(id) ON DELETE CASCADE,
  timestamp         TIMESTAMPTZ DEFAULT now(),
  lat               DOUBLE PRECISION NOT NULL,
  lng               DOUBLE PRECISION NOT NULL,
  debit1_lpm        NUMERIC(8,3) DEFAULT 0,
  debit2_lpm        NUMERIC(8,3) DEFAULT 0,
  volume_cumul_l    NUMERIC(10,3) DEFAULT 0,
  speed_kmh         NUMERIC(6,2) DEFAULT 0,
  hdop              NUMERIC(5,2),
  satellites        INTEGER
);

-- Audit log (immutable)
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  user_id     UUID REFERENCES auth.users(id),
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── MODULE 4 : CONFORMITÉ ET EXPORT ─────────────────────────────

CREATE TABLE IF NOT EXISTS dossiers_export (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id     UUID REFERENCES exploitations(id),
  parcelle_ids        UUID[],
  pays_cible          TEXT NOT NULL,
  date_recolte        DATE NOT NULL,
  statut_lmr          TEXT,
  resultats_lmr       JSONB,
  pdf_url             TEXT,
  qr_hash             TEXT UNIQUE,
  signe_par           UUID REFERENCES auth.users(id),
  date_signature      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lmr_references (
  id              BIGSERIAL PRIMARY KEY,
  matiere_active  TEXT NOT NULL,
  culture         TEXT NOT NULL,
  pays_zone       TEXT NOT NULL,
  lmr_mg_kg       NUMERIC(8,4) NOT NULL,
  source          TEXT,
  updated_at      DATE
);

-- ── MODULE 5 : UTILISATEURS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),
  exploitation_id UUID REFERENCES exploitations(id),
  role            TEXT NOT NULL DEFAULT 'operateur'
    CHECK (role IN ('directeur','responsable_technique','magasinier','operateur','auditeur')),
  nom_complet     TEXT,
  telephone       TEXT,
  langue          TEXT DEFAULT 'fr',
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── INDEXES ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_traitements_parcelle_id    ON traitements(parcelle_id);
CREATE INDEX IF NOT EXISTS idx_traitements_status         ON traitements(status);
CREATE INDEX IF NOT EXISTS idx_traitements_device_id      ON traitements(device_id);
CREATE INDEX IF NOT EXISTS idx_traitements_created_at     ON traitements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traitement_points_id       ON traitement_points(traitement_id);
CREATE INDEX IF NOT EXISTS idx_traitement_points_ts       ON traitement_points(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_lot_id     ON stock_movements(lot_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lots_stock_produit_id      ON lots_stock(produit_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id        ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_lmr_references_ma_culture  ON lmr_references(matiere_active, culture, pays_zone);

-- ── MATERIALIZED VIEW : STOCK TEMPS RÉEL ────────────────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS stock_temps_reel AS
SELECT
  l.id                                              AS lot_id,
  l.produit_id,
  l.exploitation_id,
  l.numero_lot,
  l.date_peremption,
  l.unite,
  l.prix_unitaire_dzd,
  l.quantite_initiale
    + COALESCE(SUM(m.quantite), 0)                  AS stock_disponible,
  (l.quantite_initiale + COALESCE(SUM(m.quantite), 0))
    * COALESCE(l.prix_unitaire_dzd, 0)              AS valeur_dzd
FROM lots_stock l
LEFT JOIN stock_movements m ON m.lot_id = l.id
GROUP BY l.id, l.produit_id, l.exploitation_id, l.numero_lot,
         l.date_peremption, l.unite, l.prix_unitaire_dzd, l.quantite_initiale;

CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_temps_reel_lot ON stock_temps_reel(lot_id);

-- ── RLS ─────────────────────────────────────────────────────────

ALTER TABLE exploitations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE parcelles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits_ppp         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots_stock           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE traitements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE traitement_points    ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers_export      ENABLE ROW LEVEL SECURITY;

-- Base policy: user accesses only their own exploitation
CREATE POLICY IF NOT EXISTS "own_exploitation_parcelles" ON parcelles
  USING (exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS "own_exploitation_traitements" ON traitements
  USING (exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ) OR device_id IS NOT NULL);  -- IoT device inserts allowed

CREATE POLICY IF NOT EXISTS "own_exploitation_stock" ON lots_stock
  USING (exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY IF NOT EXISTS "own_exploitation_mvts" ON stock_movements
  USING (exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ));

-- Audit log: read-only for all authenticated users, insert-only (no update/delete)
CREATE POLICY IF NOT EXISTS "audit_log_insert" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "audit_log_select" ON audit_log
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── REALTIME ────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE traitements;
ALTER PUBLICATION supabase_realtime ADD TABLE traitement_points;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;

-- ── TRIGGER : updated_at ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS traitements_updated_at ON traitements;
CREATE TRIGGER traitements_updated_at
  BEFORE UPDATE ON traitements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SEED : Domaine Khelifa ───────────────────────────────────────

INSERT INTO produits_ppp (nom_commercial, matiere_active, pourcentage_ma, formulation, classification_tox, dar_par_culture, homologue_inpv)
VALUES
  ('Sumi-Alpha 5 EC',  'Esfenvalérate',  5,    'EC', 'T',  '{"palmier": 14, "agrumes": 21}',   true),
  ('Confidor 200 SL',  'Imidaclopride',  17.8, 'SL', 'Xn', '{"palmier": 21, "olivier": 21}',   true),
  ('Score 250 EC',     'Difénoconazole', 25,   'EC', 'Xn', '{"agrumes": 14, "olivier": 14}',   true),
  ('Calypso 480 SC',   'Thiaclopride',   48,   'SC', 'Xn', '{"palmier": 14}',                  true),
  ('Topas 100 EC',     'Penconazole',    10,   'EC', 'Xn', '{"agrumes": 14, "vigne": 21}',     true)
ON CONFLICT DO NOTHING;

INSERT INTO lmr_references (matiere_active, culture, pays_zone, lmr_mg_kg, source)
VALUES
  ('Esfenvalérate',  'palmier dattier', 'EU',    0.05, 'CE 396/2005'),
  ('Esfenvalérate',  'agrumes',         'EU',    0.1,  'CE 396/2005'),
  ('Imidaclopride',  'palmier dattier', 'EU',    0.05, 'CE 396/2005'),
  ('Imidaclopride',  'olivier',         'EU',    0.5,  'CE 396/2005'),
  ('Difénoconazole', 'agrumes',         'EU',    0.6,  'CE 396/2005'),
  ('Difénoconazole', 'agrumes',         'FR',    0.6,  'CE 396/2005'),
  ('Thiaclopride',   'palmier dattier', 'EU',    0.02, 'CE 396/2005'),
  ('Penconazole',    'agrumes',         'EU',    0.05, 'CE 396/2005'),
  ('Esfenvalérate',  'palmier dattier', 'AE',    0.1,  'GCC/CODEX'),
  ('Imidaclopride',  'palmier dattier', 'AE',    0.1,  'GCC/CODEX')
ON CONFLICT DO NOTHING;
