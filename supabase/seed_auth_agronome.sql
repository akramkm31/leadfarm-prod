-- Utilisateur agronome de test (après création dans Auth)
-- Email suggéré : agronome@leadfarm.dz
-- Création : LEADFARM_USER_EMAIL=agronome@leadfarm.dz LEADFARM_USER_ROLE=agronome LEADFARM_USER_PASSWORD=... node scripts/create-leadfarm-user.mjs

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
  'agronome',
  'Karim Boudiaf',
  'fr'
FROM auth.users u
WHERE u.email = 'agronome@leadfarm.dz'
ON CONFLICT (id) DO UPDATE SET
  exploitation_id = EXCLUDED.exploitation_id,
  role = 'agronome',
  nom_complet = EXCLUDED.nom_complet;

-- Ou basculer un compte existant :
-- UPDATE user_profiles SET role = 'agronome'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'votre@email.dz' LIMIT 1);
