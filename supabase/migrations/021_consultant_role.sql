-- ═══════════════════════════════════════════════════════════════
-- LeadFarm Migration 021 — Consultant Role & RBAC Setup
-- ═══════════════════════════════════════════════════════════════

-- 1. Bridge role columns for compatibility with Block 2.1
ALTER TABLE role ADD COLUMN IF NOT EXISTS nom_role TEXT;
ALTER TABLE role ADD COLUMN IF NOT EXISTS description_role TEXT;

-- Synchronize/Backfill existing roles
UPDATE role SET nom_role = UPPER(code_role) WHERE nom_role IS NULL;
UPDATE role SET description_role = libelle_role WHERE description_role IS NULL;

-- Ensure CONSULTANT exists
INSERT INTO role (identifiant_role, code_role, libelle_role, nom_role, description_role) VALUES
  (8, 'consultant', 'Consultant Externe', 'CONSULTANT', 'Expert externe cross-tenant — crée les plans annuels/trimestriels, valide les protocoles IA')
ON CONFLICT (identifiant_role) DO NOTHING;

UPDATE role 
SET nom_role = 'CONSULTANT', 
    description_role = 'Expert externe cross-tenant — crée les plans annuels/trimestriels, valide les protocoles IA'
WHERE code_role = 'consultant' OR nom_role = 'CONSULTANT';

-- 2. Bridge permission columns
ALTER TABLE permission ADD COLUMN IF NOT EXISTS ressource TEXT;
ALTER TABLE permission ADD COLUMN IF NOT EXISTS action_permise TEXT;

-- Synchronize/Backfill permissions
UPDATE permission SET ressource = module WHERE ressource IS NULL;
UPDATE permission SET action_permise = action WHERE action_permise IS NULL;

-- Permissions for CONSULTANT
DO $$
DECLARE
  consultant_id INT;
BEGIN
  SELECT identifiant_role INTO consultant_id FROM role WHERE nom_role = 'CONSULTANT' LIMIT 1;

  IF consultant_id IS NOT NULL THEN
    -- Seed new columns
    INSERT INTO permission (identifiant_role, module, action, ressource, action_permise) VALUES
      (consultant_id, 'PLAN_CONSULTANT',        'READ,WRITE,DELETE', 'PLAN_CONSULTANT',        'READ,WRITE,DELETE'),
      (consultant_id, 'PLANNING_OPERATIONNEL',  'READ',              'PLANNING_OPERATIONNEL',  'READ'),
      (consultant_id, 'DETECTION',              'READ',              'DETECTION',              'READ'),
      (consultant_id, 'EVENEMENT_AGRONOMIQUE',  'READ',              'EVENEMENT_AGRONOMIQUE',  'READ'),
      (consultant_id, 'DECISION',               'READ,WRITE',        'DECISION',               'READ,WRITE'),
      (consultant_id, 'RAPPORT',                'READ,EXPORT',       'RAPPORT',                'READ,EXPORT'),
      (consultant_id, 'PARCELLE',               'READ',              'PARCELLE',               'READ'),
      (consultant_id, 'CAMPAGNE',               'READ',              'CAMPAGNE',               'READ')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
