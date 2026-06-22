-- ═══════════════════════════════════════════════════════════════
-- LeadFarm — Tester les profils RBAC (Supabase SQL Editor)
--
-- ⚠️ auth.uid() est NULL dans le SQL Editor → utilisez l'email ou l'UUID.
-- Après chaque UPDATE : déconnexion + reconnexion sur http://localhost:3000/login
-- ═══════════════════════════════════════════════════════════════

-- 1) Voir tous les utilisateurs Auth + profil actuel
SELECT
  u.id AS user_uuid,
  u.email,
  p.role,
  p.nom_complet,
  p.exploitation_id
FROM auth.users u
LEFT JOIN user_profiles p ON p.id = u.id
ORDER BY u.email;

-- ─────────────────────────────────────────────────────────────
-- 2) PASSER EN DIRECTEUR (accès /admin + toutes les pages MCD)
-- Remplacez l'email si besoin
-- ─────────────────────────────────────────────────────────────
UPDATE user_profiles
SET role = 'directeur'
WHERE id = (SELECT id FROM auth.users WHERE email = 'akram@leadfarm.dz' LIMIT 1);

-- Si la ligne n'existe pas encore, créer le profil (exécutez aussi seed_auth_akram.sql)
-- INSERT ... voir supabase/seed_auth_akram.sql

-- ─────────────────────────────────────────────────────────────
-- 3) Tester les AUTRES profils (un seul à la fois)
-- ─────────────────────────────────────────────────────────────

-- Responsable technique (tout MCD sauf /admin)
-- UPDATE user_profiles SET role = 'responsable_technique'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'akram@leadfarm.dz' LIMIT 1);

-- Magasinier (pas de pages MCD nouvelles)
-- UPDATE user_profiles SET role = 'magasinier'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'akram@leadfarm.dz' LIMIT 1);

-- Agronome (planification phyto, satellite, pas exécution terrain)
-- UPDATE user_profiles SET role = 'agronome'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'akram@leadfarm.dz' LIMIT 1);

-- Opérateur terrain
-- UPDATE user_profiles SET role = 'operateur'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'akram@leadfarm.dz' LIMIT 1);

-- Auditeur
-- UPDATE user_profiles SET role = 'auditeur'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'akram@leadfarm.dz' LIMIT 1);

-- ─────────────────────────────────────────────────────────────
-- 4) Par UUID explicite (copier depuis la requête §1)
-- ─────────────────────────────────────────────────────────────
-- UPDATE user_profiles SET role = 'directeur'
-- WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid;

-- 5) Vérifier après modification
SELECT u.email, p.role, p.nom_complet
FROM auth.users u
JOIN user_profiles p ON p.id = u.id
WHERE u.email = 'akram@leadfarm.dz';
