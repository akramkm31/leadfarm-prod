-- ═══════════════════════════════════════════════════════════════
-- LeadFarm — New Architecture Migration (SCD2 enabled)
-- Implements the 34 tables from the Master System Prompt
-- ═══════════════════════════════════════════════════════════════

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- GEO LAYER
-- ============================================================

CREATE TABLE IF NOT EXISTS ZONE (
  identifiant_zone        SERIAL PRIMARY KEY,
  nom_zone                VARCHAR(255) NOT NULL,
  surface_hectares        FLOAT,
  geometrie               GEOMETRY(MULTIPOLYGON, 4326)
);

CREATE TABLE IF NOT EXISTS PARCELLE (
  identifiant_parcelle    SERIAL PRIMARY KEY,
  identifiant_zone        INT REFERENCES ZONE(identifiant_zone),
  nom_parcelle            VARCHAR(255) NOT NULL,
  superficie_hectares     FLOAT,
  geometrie               GEOMETRY(POLYGON, 4326),
  type_sol                VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS MICRO_ZONE (
  identifiant_micro_zone          SERIAL PRIMARY KEY,
  identifiant_parcelle            INT REFERENCES PARCELLE(identifiant_parcelle),
  geometrie                       GEOMETRY(POLYGON, 4326),
  humidite_pourcentage            FLOAT,
  type_sol                        VARCHAR(100),
  stress_hydrique                 FLOAT,
  conductivite_electrique_ds_metre FLOAT
);

-- ============================================================
-- CAMPAIGN LAYER
-- ============================================================

CREATE TABLE IF NOT EXISTS CAMPAGNE (
  identifiant_campagne    SERIAL PRIMARY KEY,
  identifiant_zone        INT REFERENCES ZONE(identifiant_zone),
  nom_campagne            VARCHAR(255),
  date_debut              DATE,
  date_fin                DATE,
  statut_campagne         VARCHAR(50)
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS UTILISATEUR (
  identifiant_utilisateur     SERIAL PRIMARY KEY,
  nom_complet                 VARCHAR(255),
  adresse_email               VARCHAR(255) UNIQUE,
  mot_de_passe_hash           VARCHAR(255),
  role_utilisateur            VARCHAR(50) CHECK (role_utilisateur IN
                              ('ADMIN','AGRONOME','AGRICULTEUR','OBSERVATEUR')),
  numero_telephone            VARCHAR(30)
);

-- ============================================================
-- SCD2 AUDIT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS PLANTATION (
  identifiant_plantation  SERIAL PRIMARY KEY,
  identifiant_micro_zone  INT REFERENCES MICRO_ZONE(identifiant_micro_zone),
  identifiant_campagne    INT REFERENCES CAMPAGNE(identifiant_campagne),
  type_culture            VARCHAR(100),
  variete_culture         VARCHAR(100),
  nombre_plants           INT,
  date_plantation         DATE,
  -- SCD2
  date_debut_validite     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_fin_validite       TIMESTAMPTZ,
  est_actuel              BOOLEAN NOT NULL DEFAULT TRUE,
  version                 INT NOT NULL DEFAULT 1,
  action_historique       VARCHAR(10),
  modifie_par             INT REFERENCES UTILISATEUR(identifiant_utilisateur),
  date_modification       TIMESTAMPTZ DEFAULT NOW()
);

-- IOT LAYER
CREATE TABLE IF NOT EXISTS TYPE_MESURE (
  identifiant_type_mesure SERIAL PRIMARY KEY,
  code_mesure             VARCHAR(50) UNIQUE,
  libelle_mesure          VARCHAR(255),
  unite_par_defaut        VARCHAR(30)
);

CREATE TABLE IF NOT EXISTS CAPTEUR (
  identifiant_capteur         SERIAL PRIMARY KEY,
  identifiant_micro_zone      INT REFERENCES MICRO_ZONE(identifiant_micro_zone),
  type_capteur                VARCHAR(100),
  modele_capteur              VARCHAR(100),
  statut_capteur              VARCHAR(50),
  derniere_synchronisation    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS MESURE_IOT (
  identifiant_mesure          SERIAL PRIMARY KEY,
  identifiant_capteur         INT REFERENCES CAPTEUR(identifiant_capteur),
  identifiant_type_mesure     INT REFERENCES TYPE_MESURE(identifiant_type_mesure),
  horodatage                  TIMESTAMPTZ,
  valeur_mesuree              FLOAT,
  unite_mesure                VARCHAR(30)
);

-- SATELLITE
CREATE TABLE IF NOT EXISTS DONNEES_SATELLITE (
  identifiant_satellite       SERIAL PRIMARY KEY,
  identifiant_parcelle        INT REFERENCES PARCELLE(identifiant_parcelle),
  date_acquisition            DATE,
  indice_vegetation_ndvi      FLOAT,
  indice_eau_ndwi             FLOAT,
  source_satellite            VARCHAR(100),
  geometrie                   GEOMETRY(POLYGON, 4326)
);

CREATE TABLE IF NOT EXISTS DONNEES_METEOROLOGIQUES (
  identifiant_meteo                   SERIAL PRIMARY KEY,
  identifiant_zone                    INT REFERENCES ZONE(identifiant_zone),
  date_mesure                         DATE,
  temperature_minimale_celsius        FLOAT,
  temperature_maximale_celsius        FLOAT,
  humidite_pourcentage                FLOAT,
  pluviometrie_millimetres            FLOAT,
  vitesse_vent_km_heure               FLOAT,
  geometrie                           GEOMETRY(POINT, 4326)
);

-- PROTOCOLS
CREATE TABLE IF NOT EXISTS PROTOCOLE (
  identifiant_protocole       SERIAL PRIMARY KEY,
  type_culture                VARCHAR(100),
  variete_culture             VARCHAR(100),
  description_protocole       TEXT
);

CREATE TABLE IF NOT EXISTS ETAPE_PROTOCOLE (
  identifiant_etape           SERIAL PRIMARY KEY,
  identifiant_protocole       INT REFERENCES PROTOCOLE(identifiant_protocole),
  date_debut_etape            DATE,
  date_fin_etape              DATE,
  type_action                 VARCHAR(100),
  description_action          TEXT,
  unite_action                VARCHAR(50)
);

-- CENTRAL EVENT HUB (SCD2)
CREATE TABLE IF NOT EXISTS EVENEMENT_AGRONOMIQUE (
  identifiant_evenement       SERIAL PRIMARY KEY,
  identifiant_plantation      INT REFERENCES PLANTATION(identifiant_plantation),
  identifiant_utilisateur     INT REFERENCES UTILISATEUR(identifiant_utilisateur),
  identifiant_protocole       INT REFERENCES PROTOCOLE(identifiant_protocole),
  date_evenement              TIMESTAMPTZ,
  source_evenement            VARCHAR(50) CHECK (source_evenement IN
                              ('MANUEL','IOT','SATELLITE','IA','MOBILE')),
  type_evenement              VARCHAR(100),
  geometrie                   GEOMETRY(POINT, 4326),
  -- SCD2
  date_debut_validite         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_fin_validite           TIMESTAMPTZ,
  est_actuel                  BOOLEAN NOT NULL DEFAULT TRUE,
  version                     INT NOT NULL DEFAULT 1,
  action_historique           VARCHAR(10),
  modifie_par                 INT REFERENCES UTILISATEUR(identifiant_utilisateur),
  date_modification           TIMESTAMPTZ DEFAULT NOW()
);

-- EVENT EXTENSIONS
CREATE TABLE IF NOT EXISTS MALADIE (
  identifiant_maladie         SERIAL PRIMARY KEY,
  nom_maladie                 VARCHAR(255),
  description_maladie         TEXT,
  type_pathogene              VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS EVENEMENT_MALADIE (
  identifiant_evenement       INT REFERENCES EVENEMENT_AGRONOMIQUE(identifiant_evenement),
  identifiant_maladie         INT REFERENCES MALADIE(identifiant_maladie),
  severite_maladie            VARCHAR(50),
  PRIMARY KEY (identifiant_evenement, identifiant_maladie),
  -- SCD2
  date_debut_validite         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_fin_validite           TIMESTAMPTZ,
  est_actuel                  BOOLEAN NOT NULL DEFAULT TRUE,
  version                     INT NOT NULL DEFAULT 1,
  action_historique           VARCHAR(10),
  modifie_par                 INT,
  date_modification           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS PRODUIT_PHYTOSANITAIRE (
  identifiant_produit         SERIAL PRIMARY KEY,
  nom_produit                 VARCHAR(255),
  type_produit                VARCHAR(100),
  impact_environnemental      FLOAT,
  unite_dosage                VARCHAR(50),
  matiere_active              VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS EVENEMENT_PRODUIT (
  identifiant_evenement       INT REFERENCES EVENEMENT_AGRONOMIQUE(identifiant_evenement),
  identifiant_produit         INT REFERENCES PRODUIT_PHYTOSANITAIRE(identifiant_produit),
  dose_appliquee              FLOAT,
  unite_dose                  VARCHAR(50),
  PRIMARY KEY (identifiant_evenement, identifiant_produit),
  -- SCD2
  date_debut_validite         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_fin_validite           TIMESTAMPTZ,
  est_actuel                  BOOLEAN NOT NULL DEFAULT TRUE,
  version                     INT NOT NULL DEFAULT 1,
  action_historique           VARCHAR(10),
  modifie_par                 INT,
  date_modification           TIMESTAMPTZ DEFAULT NOW()
);

-- FINANCE
CREATE TABLE IF NOT EXISTS DEPENSE (
  identifiant_depense         SERIAL PRIMARY KEY,
  identifiant_evenement       INT REFERENCES EVENEMENT_AGRONOMIQUE(identifiant_evenement),
  type_depense                VARCHAR(100),
  montant_depense             FLOAT,
  devise                      VARCHAR(10) DEFAULT 'DZD',
  -- SCD2
  date_debut_validite         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_fin_validite           TIMESTAMPTZ,
  est_actuel                  BOOLEAN NOT NULL DEFAULT TRUE,
  version                     INT NOT NULL DEFAULT 1,
  action_historique           VARCHAR(10),
  modifie_par                 INT,
  date_modification           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS RECOLTE (
  identifiant_recolte         SERIAL PRIMARY KEY,
  identifiant_evenement       INT REFERENCES EVENEMENT_AGRONOMIQUE(identifiant_evenement),
  quantite_recoltee           FLOAT,
  unite_recolte               VARCHAR(50),
  qualite_recolte             VARCHAR(100),
  identifiant_lot             VARCHAR(100),
  -- SCD2
  date_debut_validite         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_fin_validite           TIMESTAMPTZ,
  est_actuel                  BOOLEAN NOT NULL DEFAULT TRUE,
  version                     INT NOT NULL DEFAULT 1,
  action_historique           VARCHAR(10),
  modifie_par                 INT,
  date_modification           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS REVENU (
  identifiant_revenu          SERIAL PRIMARY KEY,
  identifiant_evenement       INT REFERENCES EVENEMENT_AGRONOMIQUE(identifiant_evenement),
  identifiant_recolte         INT REFERENCES RECOLTE(identifiant_recolte),
  montant_revenu              FLOAT,
  prix_marche                 FLOAT,
  devise                      VARCHAR(10) DEFAULT 'DZD'
);

CREATE TABLE IF NOT EXISTS RESULTAT (
  identifiant_resultat        SERIAL PRIMARY KEY,
  identifiant_evenement       INT REFERENCES EVENEMENT_AGRONOMIQUE(identifiant_evenement),
  taux_efficacite             FLOAT,
  rendement_culture           FLOAT,
  unite_rendement             VARCHAR(50),
  -- SCD2
  date_debut_validite         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_fin_validite           TIMESTAMPTZ,
  est_actuel                  BOOLEAN NOT NULL DEFAULT TRUE,
  version                     INT NOT NULL DEFAULT 1,
  action_historique           VARCHAR(10),
  modifie_par                 INT,
  date_modification           TIMESTAMPTZ DEFAULT NOW()
);

-- ALERTS
CREATE TABLE IF NOT EXISTS ALERTE (
  identifiant_alerte          SERIAL PRIMARY KEY,
  identifiant_evenement       INT REFERENCES EVENEMENT_AGRONOMIQUE(identifiant_evenement),
  canal_notification          VARCHAR(50), -- 'WHATSAPP','SMS','EMAIL','IN_APP'
  message_alerte              TEXT,
  statut_alerte               VARCHAR(50),
  date_envoi                  TIMESTAMPTZ
);

-- AI / ML LAYER
CREATE TABLE IF NOT EXISTS DECISION (
  identifiant_decision        SERIAL PRIMARY KEY,
  recommandation_agronomique  TEXT,
  score_confiance             FLOAT,
  type_decision               VARCHAR(100),
  statut_decision             VARCHAR(50),
  -- SCD2
  date_debut_validite         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_fin_validite           TIMESTAMPTZ,
  est_actuel                  BOOLEAN NOT NULL DEFAULT TRUE,
  version                     INT NOT NULL DEFAULT 1,
  action_historique           VARCHAR(10),
  modifie_par                 INT,
  date_modification           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS DECISION_EVENEMENT (
  identifiant_decision        INT REFERENCES DECISION(identifiant_decision),
  identifiant_evenement       INT REFERENCES EVENEMENT_AGRONOMIQUE(identifiant_evenement),
  PRIMARY KEY (identifiant_decision, identifiant_evenement)
);

CREATE TABLE IF NOT EXISTS APPRENTISSAGE (
  identifiant_apprentissage   SERIAL PRIMARY KEY,
  identifiant_decision        INT REFERENCES DECISION(identifiant_decision),
  identifiant_resultat        INT REFERENCES RESULTAT(identifiant_resultat),
  score_performance           FLOAT,
  horodatage                  TIMESTAMPTZ,
  source_feedback             VARCHAR(100),
  type_ajustement_modele      VARCHAR(100),
  version_modele_ia           VARCHAR(50)
);

-- ============================================================
-- VIEWS (Current State)
-- ============================================================

CREATE OR REPLACE VIEW v_plantation_actuelle AS
  SELECT * FROM PLANTATION WHERE est_actuel = TRUE;

CREATE OR REPLACE VIEW v_evenement_actuel AS
  SELECT * FROM EVENEMENT_AGRONOMIQUE WHERE est_actuel = TRUE;

CREATE OR REPLACE VIEW v_recolte_actuelle AS
  SELECT * FROM RECOLTE WHERE est_actuel = TRUE;

-- ============================================================
-- RLS (Basic Enabled)
-- ============================================================

ALTER TABLE ZONE ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Access" ON ZONE FOR SELECT USING (true);
-- Add more specific policies as needed
