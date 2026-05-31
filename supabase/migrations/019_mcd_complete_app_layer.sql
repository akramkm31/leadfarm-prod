-- ═══════════════════════════════════════════════════════════════
-- LeadFarm 019 — Couche MCD complète (modèle app UUID / exploitations)
-- Aligné MCD v2 : micro-zones, protocoles, maladies, récoltes, IA, agrégats
-- ═══════════════════════════════════════════════════════════════

-- ── Référentiel types d'événement ──
CREATE TABLE IF NOT EXISTS type_evenement (
  code TEXT PRIMARY KEY,
  libelle TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'autre',
  requiert_validation BOOLEAN NOT NULL DEFAULT false,
  requiert_meteo BOOLEAN NOT NULL DEFAULT false,
  requiert_dar BOOLEAN NOT NULL DEFAULT false,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO type_evenement (code, libelle, categorie, requiert_validation, requiert_meteo, requiert_dar) VALUES
  ('pulverisation', 'Pulvérisation', 'traitement', true, true, true),
  ('fertilisation', 'Fertilisation', 'traitement', true, true, false),
  ('desherbage', 'Désherbage', 'traitement', true, true, true),
  ('fongicide', 'Fongicide', 'traitement', true, true, true),
  ('irrigation', 'Irrigation', 'irrigation', false, false, false),
  ('recolte', 'Récolte', 'recolte', false, false, false),
  ('observation_maladie', 'Observation maladie', 'maladie', false, false, false),
  ('analyse_sol', 'Analyse sol', 'analyse', false, false, false)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE treatments ADD COLUMN IF NOT EXISTS type_evenement_code TEXT REFERENCES type_evenement(code);
CREATE INDEX IF NOT EXISTS idx_treatments_type_evenement ON treatments(type_evenement_code);

-- ── Micro-zones ──
CREATE TABLE IF NOT EXISTS micro_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id UUID NOT NULL REFERENCES parcelles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  boundary JSONB,
  humidite_pourcentage DOUBLE PRECISION,
  type_sol TEXT,
  stress_hydrique DOUBLE PRECISION,
  conductivite_electrique_ds_m DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_micro_zones_parcelle ON micro_zones(parcelle_id);

ALTER TABLE plantations ADD COLUMN IF NOT EXISTS micro_zone_id UUID REFERENCES micro_zones(id) ON DELETE SET NULL;

-- ── Données météo (par exploitation / zone nom) ──
CREATE TABLE IF NOT EXISTS donnees_meteo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id UUID NOT NULL REFERENCES exploitations(id) ON DELETE CASCADE,
  zone_label TEXT,
  date_mesure DATE NOT NULL,
  temperature_min_c DOUBLE PRECISION,
  temperature_max_c DOUBLE PRECISION,
  humidite_pourcentage DOUBLE PRECISION,
  pluviometrie_mm DOUBLE PRECISION,
  vitesse_vent_kmh DOUBLE PRECISION,
  source TEXT DEFAULT 'station',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_donnees_meteo_exp_date ON donnees_meteo(exploitation_id, date_mesure DESC);

-- ── Données satellite ──
CREATE TABLE IF NOT EXISTS donnees_satellite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id UUID NOT NULL REFERENCES parcelles(id) ON DELETE CASCADE,
  date_acquisition DATE NOT NULL,
  indice_ndvi DOUBLE PRECISION,
  indice_ndwi DOUBLE PRECISION,
  source_satellite TEXT DEFAULT 'Sentinel-2',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_donnees_satellite_parcelle ON donnees_satellite(parcelle_id, date_acquisition DESC);

-- ── Maladies ──
CREATE TABLE IF NOT EXISTS maladies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT,
  type_pathogene TEXT,
  cultures_cibles TEXT[] DEFAULT '{}',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evenements_maladie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maladie_id UUID NOT NULL REFERENCES maladies(id) ON DELETE CASCADE,
  parcelle_id UUID REFERENCES parcelles(id) ON DELETE SET NULL,
  plantation_id UUID REFERENCES plantations(id) ON DELETE SET NULL,
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  severite TEXT NOT NULL DEFAULT 'moderee' CHECK (severite IN ('faible','moderee','elevee','critique')),
  date_observation TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  source TEXT DEFAULT 'MANUEL' CHECK (source IN ('MANUEL','IOT','SATELLITE','IA','MOBILE')),
  geometrie JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evenements_maladie_parcelle ON evenements_maladie(parcelle_id);

-- ── Protocoles ──
CREATE TABLE IF NOT EXISTS protocoles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id UUID REFERENCES exploitations(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  type_culture TEXT,
  variete_culture TEXT,
  description TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS etapes_protocole (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocole_id UUID NOT NULL REFERENCES protocoles(id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL DEFAULT 1,
  jours_apres_plantation INTEGER,
  type_action TEXT NOT NULL,
  description TEXT,
  type_evenement_code TEXT REFERENCES type_evenement(code),
  unite_action TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_etapes_protocole ON etapes_protocole(protocole_id, ordre);

-- ── Récoltes & revenus ──
CREATE TABLE IF NOT EXISTS recoltes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id UUID NOT NULL REFERENCES parcelles(id) ON DELETE CASCADE,
  campagne_id UUID REFERENCES campagnes(id) ON DELETE SET NULL,
  plantation_id UUID REFERENCES plantations(id) ON DELETE SET NULL,
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  date_recolte DATE NOT NULL,
  quantite DOUBLE PRECISION NOT NULL,
  unite TEXT NOT NULL DEFAULT 'kg',
  qualite TEXT,
  identifiant_lot TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recoltes_campagne ON recoltes(campagne_id);

CREATE TABLE IF NOT EXISTS revenus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recolte_id UUID REFERENCES recoltes(id) ON DELETE CASCADE,
  campagne_id UUID REFERENCES campagnes(id) ON DELETE SET NULL,
  montant_dzd DOUBLE PRECISION NOT NULL,
  prix_unitaire_dzd DOUBLE PRECISION,
  devise TEXT DEFAULT 'DZD',
  date_encaissement DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS depenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  campagne_id UUID REFERENCES campagnes(id) ON DELETE SET NULL,
  type_depense TEXT NOT NULL,
  montant_dzd DOUBLE PRECISION NOT NULL,
  devise TEXT DEFAULT 'DZD',
  date_depense DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Résultats post-événement ──
CREATE TABLE IF NOT EXISTS resultats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  parcelle_id UUID REFERENCES parcelles(id) ON DELETE SET NULL,
  taux_efficacite DOUBLE PRECISION,
  rendement_observe DOUBLE PRECISION,
  unite_rendement TEXT DEFAULT 't/ha',
  date_evaluation DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Mesures agrégées (dashboards IoT) ──
CREATE TABLE IF NOT EXISTS mesures_agregees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT,
  parcelle_id UUID REFERENCES parcelles(id) ON DELETE SET NULL,
  type_mesure TEXT NOT NULL,
  periode TEXT NOT NULL CHECK (periode IN ('heure','jour','semaine')),
  bucket_start TIMESTAMPTZ NOT NULL,
  valeur_moyenne DOUBLE PRECISION,
  valeur_min DOUBLE PRECISION,
  valeur_max DOUBLE PRECISION,
  nb_echantillons INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (device_id, type_mesure, periode, bucket_start)
);
CREATE INDEX IF NOT EXISTS idx_mesures_agregees_bucket ON mesures_agregees(bucket_start DESC);

-- ── IA : décisions & apprentissage ──
CREATE TABLE IF NOT EXISTS ia_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id UUID REFERENCES exploitations(id) ON DELETE CASCADE,
  recommandation TEXT NOT NULL,
  score_confiance DOUBLE PRECISION,
  type_decision TEXT,
  statut TEXT DEFAULT 'proposee' CHECK (statut IN ('proposee','acceptee','rejetee','expiree')),
  parcelle_id UUID REFERENCES parcelles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS decision_evenements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES ia_decisions(id) ON DELETE CASCADE,
  treatment_id UUID REFERENCES treatments(id) ON DELETE CASCADE,
  evenement_maladie_id UUID REFERENCES evenements_maladie(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apprentissages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES ia_decisions(id) ON DELETE CASCADE,
  resultat_id UUID REFERENCES resultats(id) ON DELETE SET NULL,
  score_performance DOUBLE PRECISION,
  source_feedback TEXT,
  type_ajustement TEXT,
  version_modele TEXT,
  horodatage TIMESTAMPTZ DEFAULT now()
);

-- ── RLS (même modèle exploitation que campagnes) ──
ALTER TABLE micro_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE donnees_meteo ENABLE ROW LEVEL SECURITY;
ALTER TABLE donnees_satellite ENABLE ROW LEVEL SECURITY;
ALTER TABLE maladies ENABLE ROW LEVEL SECURITY;
ALTER TABLE evenements_maladie ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapes_protocole ENABLE ROW LEVEL SECURITY;
ALTER TABLE recoltes ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenus ENABLE ROW LEVEL SECURITY;
ALTER TABLE depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultats ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesures_agregees ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE apprentissages ENABLE ROW LEVEL SECURITY;

CREATE POLICY micro_zones_own ON micro_zones FOR ALL USING (
  parcelle_id IN (SELECT id FROM parcelles WHERE exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ))
);

CREATE POLICY donnees_meteo_own ON donnees_meteo FOR ALL USING (
  exploitation_id IN (SELECT exploitation_id FROM user_profiles WHERE id = auth.uid())
);

CREATE POLICY donnees_satellite_own ON donnees_satellite FOR ALL USING (
  parcelle_id IN (SELECT id FROM parcelles WHERE exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ))
);

CREATE POLICY maladies_read ON maladies FOR SELECT USING (true);
CREATE POLICY maladies_write ON maladies FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('directeur','responsable_technique'))
);

CREATE POLICY evenements_maladie_own ON evenements_maladie FOR ALL USING (
  parcelle_id IS NULL OR parcelle_id IN (SELECT id FROM parcelles WHERE exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ))
);

CREATE POLICY protocoles_own ON protocoles FOR ALL USING (
  exploitation_id IS NULL OR exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY etapes_protocole_own ON etapes_protocole FOR ALL USING (
  protocole_id IN (SELECT id FROM protocoles WHERE exploitation_id IS NULL OR exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ))
);

CREATE POLICY recoltes_own ON recoltes FOR ALL USING (
  parcelle_id IN (SELECT id FROM parcelles WHERE exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ))
);

CREATE POLICY revenus_own ON revenus FOR ALL USING (
  campagne_id IS NULL OR campagne_id IN (SELECT id FROM campagnes WHERE exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ))
);

CREATE POLICY depenses_own ON depenses FOR ALL USING (
  campagne_id IS NULL OR campagne_id IN (SELECT id FROM campagnes WHERE exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ))
);

CREATE POLICY resultats_own ON resultats FOR ALL USING (
  parcelle_id IS NULL OR parcelle_id IN (SELECT id FROM parcelles WHERE exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ))
);

CREATE POLICY mesures_agregees_read ON mesures_agregees FOR SELECT USING (true);

CREATE POLICY ia_decisions_own ON ia_decisions FOR ALL USING (
  exploitation_id IS NULL OR exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY apprentissages_own ON apprentissages FOR ALL USING (
  decision_id IN (SELECT id FROM ia_decisions WHERE exploitation_id IN (
    SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
  ))
);
