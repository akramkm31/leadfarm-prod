-- ═══════════════════════════════════════════════════════════════
-- LeadFarm Migration 020 — Planning Consultant & Operations Schema
-- ═══════════════════════════════════════════════════════════════

-- 1. Bridge Multi-Tenant entities
CREATE TABLE IF NOT EXISTS tenant (
  identifiant_tenant SERIAL PRIMARY KEY,
  nom_tenant VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed/backfill from exploitation
INSERT INTO tenant (identifiant_tenant, nom_tenant)
SELECT identifiant_exploitation, nom_exploitation FROM exploitation
ON CONFLICT (identifiant_tenant) DO NOTHING;

-- Seed default tenant 1 if empty
INSERT INTO tenant (identifiant_tenant, nom_tenant)
VALUES (1, 'Domaine Khelifa')
ON CONFLICT (identifiant_tenant) DO NOTHING;

CREATE TABLE IF NOT EXISTS tenant_utilisateur (
  identifiant_tenant INT REFERENCES tenant(identifiant_tenant) ON DELETE CASCADE,
  identifiant_utilisateur INT REFERENCES UTILISATEUR(identifiant_utilisateur) ON DELETE CASCADE,
  role TEXT,
  statut_acces TEXT DEFAULT 'actif',
  PRIMARY KEY (identifiant_tenant, identifiant_utilisateur)
);

-- Backfill tenant_utilisateur
INSERT INTO tenant_utilisateur (identifiant_tenant, identifiant_utilisateur, role, statut_acces)
SELECT identifiant_exploitation, identifiant_utilisateur, 'admin', 'actif'
FROM UTILISATEUR
WHERE identifiant_exploitation IS NOT NULL AND identifiant_utilisateur IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2. Plan Consultant Table
CREATE TABLE IF NOT EXISTS plan_consultant (
  id                   SERIAL PRIMARY KEY,
  id_tenant            INT NOT NULL REFERENCES tenant(identifiant_tenant) ON DELETE CASCADE,
  id_consultant        INT NOT NULL REFERENCES UTILISATEUR(identifiant_utilisateur),
  type_plan            TEXT NOT NULL CHECK (type_plan IN ('ANNUEL', 'TRIMESTRIEL')),
  type_culture         TEXT NOT NULL,
  variete              TEXT DEFAULT '*',
  statut               TEXT NOT NULL DEFAULT 'draft' CHECK (statut IN ('draft', 'submitted', 'validated', 'archived')),
  annee                INT NOT NULL,
  trimestre            INT CHECK (trimestre IN (1, 2, 3, 4)),
  date_debut           DATE NOT NULL,
  date_fin             DATE NOT NULL,
  protocoles_json      JSONB DEFAULT '[]',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  validated_at         TIMESTAMPTZ,
  validated_by         INT REFERENCES UTILISATEUR(identifiant_utilisateur),
  CONSTRAINT plan_dates_valid CHECK (date_fin > date_debut),
  CONSTRAINT trimestre_required CHECK (
    (type_plan = 'TRIMESTRIEL' AND trimestre IS NOT NULL) OR
    (type_plan = 'ANNUEL')
  )
);

-- RLS: tenant isolation
ALTER TABLE plan_consultant ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_consultant_tenant_isolation ON plan_consultant;
CREATE POLICY plan_consultant_tenant_isolation ON plan_consultant
  USING (
    id_tenant = (current_setting('app.current_tenant_id', true)::INT)
    OR id_tenant IN (
      SELECT identifiant_tenant FROM tenant_utilisateur WHERE identifiant_utilisateur = auth.uid()::text::int
    )
  );

-- Immutability: validated plan cannot be directly modified
CREATE OR REPLACE FUNCTION enforce_plan_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.statut = 'validated' AND NEW.statut = 'validated' THEN
    RAISE EXCEPTION 'A validated plan cannot be modified. Create a new revision.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plan_consultant_immutability ON plan_consultant;
CREATE TRIGGER plan_consultant_immutability
  BEFORE UPDATE ON plan_consultant
  FOR EACH ROW EXECUTE FUNCTION enforce_plan_immutability();

CREATE INDEX IF NOT EXISTS idx_plan_consultant_tenant ON plan_consultant(id_tenant);
CREATE INDEX IF NOT EXISTS idx_plan_consultant_statut ON plan_consultant(statut);

-- 3. Planning Operationnel Table
CREATE TABLE IF NOT EXISTS planning_operationnel (
  id                   SERIAL PRIMARY KEY,
  id_plan              INT REFERENCES plan_consultant(id) ON DELETE SET NULL,
  id_agronome          INT NOT NULL REFERENCES UTILISATEUR(identifiant_utilisateur),
  id_parcelle          INT NOT NULL REFERENCES PARCELLE(identifiant_parcelle),
  id_campagne          INT REFERENCES CAMPAGNE(identifiant_campagne),
  date_prevue          DATE NOT NULL,
  type_intervention    TEXT NOT NULL,
  produits_requis      JSONB DEFAULT '[]',
  operateurs_assignes  INT[] DEFAULT '{}',
  meteo_valide         BOOLEAN DEFAULT NULL,
  meteo_data           JSONB DEFAULT '{}',
  stock_valide         BOOLEAN DEFAULT NULL,
  stock_manquant       JSONB DEFAULT '[]',
  statut               TEXT NOT NULL DEFAULT 'planifie'
                         CHECK (statut IN ('planifie', 'en_cours', 'termine', 'annule', 'reporte')),
  motif_report         TEXT,
  date_reelle          DATE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT planning_cannot_start_if_blocked CHECK (
    statut != 'en_cours' OR (meteo_valide = TRUE AND stock_valide = TRUE)
  )
);

ALTER TABLE planning_operationnel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS planning_operationnel_tenant_isolation ON planning_operationnel;
CREATE POLICY planning_operationnel_tenant_isolation ON planning_operationnel
  USING (
    id_parcelle IN (
      SELECT identifiant_parcelle FROM PARCELLE WHERE identifiant_exploitation IN (
        SELECT identifiant_tenant FROM tenant_utilisateur WHERE identifiant_utilisateur = auth.uid()::text::int
      )
    )
  );

-- Business rule R10: cannot be confirmed if meteo_valide=false OR stock_valide=false
CREATE OR REPLACE FUNCTION enforce_planning_validation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.statut = 'en_cours' AND (NEW.meteo_valide IS DISTINCT FROM TRUE OR NEW.stock_valide IS DISTINCT FROM TRUE) THEN
    RAISE EXCEPTION 'Cannot start planning: meteo_valide=% stock_valide=%', NEW.meteo_valide, NEW.stock_valide;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS planning_validation_check ON planning_operationnel;
CREATE TRIGGER planning_validation_check
  BEFORE UPDATE ON planning_operationnel
  FOR EACH ROW EXECUTE FUNCTION enforce_planning_validation();

CREATE INDEX IF NOT EXISTS idx_planning_parcelle ON planning_operationnel(id_parcelle);
CREATE INDEX IF NOT EXISTS idx_planning_date ON planning_operationnel(date_prevue);
CREATE INDEX IF NOT EXISTS idx_planning_statut ON planning_operationnel(statut);

-- 4. Detection Table
CREATE TABLE IF NOT EXISTS detection (
  id                   SERIAL PRIMARY KEY,
  id_parcelle          INT NOT NULL REFERENCES PARCELLE(identifiant_parcelle),
  id_tenant            INT NOT NULL REFERENCES tenant(identifiant_tenant),
  id_operateur         INT REFERENCES UTILISATEUR(identifiant_utilisateur),
  id_capteur           INT REFERENCES CAPTEUR(identifiant_capteur),
  source               TEXT NOT NULL CHECK (source IN ('operator', 'camera_iot')),
  image_url            TEXT,
  geolocalisation      GEOMETRY(POINT, 4326),
  maladie_detectee     TEXT,
  confiance_pct        NUMERIC(5,2) CHECK (confiance_pct BETWEEN 0 AND 100),
  features_ia          JSONB DEFAULT '{}',
  version_modele       TEXT,
  confirmation_op      TEXT DEFAULT 'en_attente'
                         CHECK (confirmation_op IN ('confirme', 'anomalie', 'faux_positif', 'en_attente')),
  confirme_par         INT REFERENCES UTILISATEUR(identifiant_utilisateur),
  confirme_at          TIMESTAMPTZ,
  linked_evenement     INT REFERENCES EVENEMENT_AGRONOMIQUE(identifiant_evenement),
  horodatage           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT source_operator_requires_operateur CHECK (
    source != 'operator' OR id_operateur IS NOT NULL
  ),
  CONSTRAINT source_camera_requires_capteur CHECK (
    source != 'camera_iot' OR id_capteur IS NOT NULL
  )
);

ALTER TABLE detection ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS detection_tenant_isolation ON detection;
CREATE POLICY detection_tenant_isolation ON detection
  USING (
    id_tenant = (current_setting('app.current_tenant_id', true)::INT)
    OR id_tenant IN (
      SELECT identifiant_tenant FROM tenant_utilisateur WHERE identifiant_utilisateur = auth.uid()::text::int
    )
  );

CREATE INDEX IF NOT EXISTS idx_detection_parcelle ON detection(id_parcelle);
CREATE INDEX IF NOT EXISTS idx_detection_confirmation ON detection(confirmation_op);
CREATE INDEX IF NOT EXISTS idx_detection_source ON detection(source);
CREATE INDEX IF NOT EXISTS idx_detection_geo ON detection USING GIST(geolocalisation);

-- 5. Alert Routing Table
CREATE TABLE IF NOT EXISTS alert_routing (
  id              SERIAL PRIMARY KEY,
  id_tenant       INT NOT NULL REFERENCES tenant(identifiant_tenant),
  event_type      TEXT NOT NULL,
  role_cible      TEXT NOT NULL,
  canal           TEXT NOT NULL CHECK (canal IN ('PUSH', 'WHATSAPP', 'EMAIL', 'SMS')),
  priorite        INT NOT NULL DEFAULT 2 CHECK (priorite BETWEEN 1 AND 3),
  actif           BOOLEAN DEFAULT TRUE,
  template_key    TEXT,
  delai_minutes   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id_tenant, event_type, role_cible, canal)
);

-- Default routing rules
INSERT INTO alert_routing (id_tenant, event_type, role_cible, canal, priorite) VALUES
  (1, 'DETECTION_MALADIE_CONFIRMEE',  'AGRONOME',      'PUSH',      1),
  (1, 'DETECTION_MALADIE_CONFIRMEE',  'AGRONOME',      'WHATSAPP',  1),
  (1, 'DETECTION_MALADIE_CONFIRMEE',  'CONSULTANT',    'EMAIL',     2),
  (1, 'DETECTION_CRITIQUE',           'CONSULTANT',    'PUSH',      1),
  (1, 'DETECTION_CRITIQUE',           'CONSULTANT',    'WHATSAPP',  1),
  (1, 'RUPTURE_STOCK',                'MAGASINIER',    'PUSH',      1),
  (1, 'RUPTURE_STOCK',                'MAGASINIER',    'EMAIL',     1),
  (1, 'RUPTURE_STOCK',                'AGRONOME',      'PUSH',      2),
  (1, 'DLC_PRODUIT_PROCHE',           'MAGASINIER',    'EMAIL',     3),
  (1, 'METEO_BLOQUE_PLAN',            'AGRONOME',      'PUSH',      1),
  (1, 'METEO_BLOQUE_PLAN',            'AGRONOME',      'WHATSAPP',  1),
  (1, 'CAPTEUR_SILENCIEUX',           'AGRONOME',      'PUSH',      2),
  (1, 'PLAN_VALIDE',                  'CONSULTANT',    'EMAIL',     3)
ON CONFLICT (id_tenant, event_type, role_cible, canal) DO NOTHING;

-- 6. Seuil Intervention Table
CREATE TABLE IF NOT EXISTS seuil_intervention (
  id                    SERIAL PRIMARY KEY,
  id_tenant             INT NOT NULL REFERENCES tenant(identifiant_tenant),
  type_culture          TEXT NOT NULL,
  id_maladie            INT REFERENCES MALADIE(identifiant_maladie),
  confiance_min_pct     NUMERIC(5,2) DEFAULT 60.0,
  surface_attaque_pct   NUMERIC(5,2) DEFAULT 20.0,
  vent_max_km_h         NUMERIC(5,1) DEFAULT 20.0,
  pluie_delai_heures    INT DEFAULT 4,
  temperature_min_c     NUMERIC(4,1) DEFAULT 5.0,
  temperature_max_c     NUMERIC(4,1) DEFAULT 35.0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (id_tenant, type_culture, id_maladie)
);

-- Seed default seuil_intervention for tenant 1
INSERT INTO seuil_intervention (id_tenant, type_culture, confiance_min_pct, surface_attaque_pct, vent_max_km_h, pluie_delai_heures, temperature_min_c, temperature_max_c)
VALUES (1, 'default', 60.0, 20.0, 20.0, 4, 5.0, 35.0)
ON CONFLICT (id_tenant, type_culture, id_maladie) DO NOTHING;

-- 7. Mesure Agregee Table
CREATE TABLE IF NOT EXISTS mesure_agregee (
  id                SERIAL PRIMARY KEY,
  id_capteur        INT NOT NULL REFERENCES CAPTEUR(identifiant_capteur),
  id_type_mesure    INT NOT NULL REFERENCES TYPE_MESURE(identifiant_type_mesure),
  periode           TEXT NOT NULL CHECK (periode IN ('HORAIRE', 'JOURNALIER', 'HEBDO')),
  horodatage_debut  TIMESTAMPTZ NOT NULL,
  horodatage_fin    TIMESTAMPTZ NOT NULL,
  valeur_min        NUMERIC,
  valeur_max        NUMERIC,
  valeur_moy        NUMERIC,
  valeur_somme      NUMERIC,
  nb_mesures        INT DEFAULT 0,
  UNIQUE (id_capteur, id_type_mesure, periode, horodatage_debut)
);

CREATE INDEX IF NOT EXISTS idx_agregee_capteur_periode ON mesure_agregee(id_capteur, periode, horodatage_debut DESC);
