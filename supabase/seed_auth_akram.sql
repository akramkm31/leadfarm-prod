-- À exécuter APRÈS création de l'utilisateur dans Supabase Auth (Dashboard → Authentication → Users)
-- Email : akram@leadfarm.dz

INSERT INTO exploitations (id, nom, wilaya, commune)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Domaine Khelifa',
  'Sidi Bel Abbès',
  'Ténira'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_profiles (id, exploitation_id, role, nom_complet, langue)
SELECT
  u.id,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'directeur',
  'Akram Khelifa',
  'fr'
FROM auth.users u
WHERE u.email = 'akram@leadfarm.dz'
ON CONFLICT (id) DO UPDATE SET
  exploitation_id = EXCLUDED.exploitation_id,
  role = EXCLUDED.role,
  nom_complet = EXCLUDED.nom_complet;
