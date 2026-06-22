-- Agronome & consultant roles + satellite read policy clarity

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN (
    'directeur',
    'responsable_technique',
    'agronome',
    'magasinier',
    'operateur',
    'auditeur',
    'consultant'
  ));

COMMENT ON COLUMN user_profiles.role IS
  'Profil RBAC applicatif — voir src/lib/rbac/matrix.ts';
