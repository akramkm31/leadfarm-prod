-- ═══════════════════════════════════════════════════════════════
-- LeadFarm — Multi-Tenancy & RBAC Implementation
-- Based on Technical Architecture 2.0
-- ═══════════════════════════════════════════════════════════════

-- 1. EXPLOITATION TABLE (Master Entity)
CREATE TABLE IF NOT EXISTS exploitation (
  identifiant_exploitation SERIAL PRIMARY KEY,
  nom_exploitation         TEXT NOT NULL,
  raison_sociale           TEXT,
  pays                     TEXT DEFAULT 'DZ',
  fuseau_horaire           TEXT DEFAULT 'Africa/Algiers',
  langue_principale        TEXT DEFAULT 'fr',
  certifications           JSONB DEFAULT '[]', -- ['globalgap', 'bio', 'haccp']
  date_inscription         TIMESTAMP DEFAULT NOW(),
  statut_exploitation      TEXT DEFAULT 'actif'
);

-- 2. RBAC LAYER (Roles & Permissions)
CREATE TABLE IF NOT EXISTS role (
  identifiant_role INT PRIMARY KEY,
  code_role        TEXT UNIQUE NOT NULL,
  libelle_role     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permission (
  identifiant_permission SERIAL PRIMARY KEY,
  identifiant_role       INT REFERENCES role(identifiant_role) ON DELETE CASCADE,
  module                 TEXT NOT NULL,
  action                 TEXT NOT NULL -- read | write | delete | execute
);

-- 3. SEED ROLES
INSERT INTO role (identifiant_role, code_role, libelle_role) VALUES
(1, 'admin', 'Administrateur'),
(2, 'expert', 'Agronome / Expert'),
(3, 'operator', 'Opérateur'),
(4, 'chauffeur', 'Chauffeur / Travailleur de terrain'),
(5, 'stock', 'Gestionnaire de Stock'),
(6, 'viewer', 'Observateur'),
(7, 'auditor', 'Auditeur Externe')
ON CONFLICT DO NOTHING;

-- 4. UPDATE UTILISATEUR TABLE
ALTER TABLE UTILISATEUR ADD COLUMN IF NOT EXISTS identifiant_exploitation INT REFERENCES exploitation(identifiant_exploitation);
ALTER TABLE UTILISATEUR ADD COLUMN IF NOT EXISTS identifiant_role INT REFERENCES role(identifiant_role);

-- 5. ENABLE TENANCY ON ALL CORE TABLES
-- Adding identifiant_exploitation to all domain tables
DO $$
DECLARE
    table_name TEXT;
    tables_to_update TEXT[] := ARRAY[
        'ZONE', 'PARCELLE', 'MICRO_ZONE', 'CAMPAGNE', 'PLANTATION', 
        'MESURE_IOT', 'DONNEES_SATELLITE', 'DONNEES_METEOROLOGIQUES', 
        'EVENEMENT_AGRONOMIQUE', 'RECOLTE', 'ALERTE', 'DECISION'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_update
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS identifiant_exploitation INT REFERENCES exploitation(identifiant_exploitation)', table_name);
    END LOOP;
END $$;

-- 6. RLS POLICIES (Tenant Isolation)
-- All domain tables carry exploitation_id. RLS policies filter by auth.jwt() ->> 'exploitation_id'
DO $$
DECLARE
    table_name TEXT;
    tables_to_secure TEXT[] := ARRAY[
        'ZONE', 'PARCELLE', 'MICRO_ZONE', 'CAMPAGNE', 'PLANTATION', 
        'MESURE_IOT', 'DONNEES_SATELLITE', 'DONNEES_METEOROLOGIQUES', 
        'EVENEMENT_AGRONOMIQUE', 'RECOLTE', 'ALERTE', 'DECISION'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_secure
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', table_name);
        EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (identifiant_exploitation = (auth.jwt() ->> ''exploitation_id'')::int)', table_name);
    END LOOP;
END $$;
