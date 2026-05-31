/**
 * Crée un utilisateur Supabase Auth + profil exploitation.
 *
 * Usage (ne commitez jamais la clé service) :
 *   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/create-leadfarm-user.mjs
 *
 * Variables optionnelles :
 *   LEADFARM_USER_EMAIL    (défaut: akram@leadfarm.dz)
 *   LEADFARM_USER_PASSWORD (obligatoire si pas passé en 2e argument)
 *   LEADFARM_USER_NAME     (défaut: Akram Khelifa)
 *   LEADFARM_USER_ROLE     (défaut: directeur)
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.LEADFARM_USER_EMAIL || process.argv[2] || "akram@leadfarm.dz";
const password = process.env.LEADFARM_USER_PASSWORD || process.argv[3];
const fullName = process.env.LEADFARM_USER_NAME || "Akram Khelifa";
const role = process.env.LEADFARM_USER_ROLE || "directeur";
const exploitationId =
  process.env.LEADFARM_EXPLOITATION_ID || "a0000000-0000-4000-8000-000000000001";

if (!url || !serviceKey) {
  console.error(
    "Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans .env.local"
  );
  process.exit(1);
}

if (!password) {
  console.error("Mot de passe requis : LEADFARM_USER_PASSWORD ou 3e argument du script");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

let userId = created?.user?.id;

if (createErr) {
  if (!String(createErr.message).toLowerCase().includes("already")) {
    console.error("createUser:", createErr.message);
    process.exit(1);
  }
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) {
    console.error("Utilisateur existant mais introuvable dans la liste");
    process.exit(1);
  }
  userId = existing.id;
  await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  console.log("Utilisateur existant — mot de passe mis à jour");
} else {
  console.log("Utilisateur créé:", email);
}

const { error: profileErr } = await admin.from("user_profiles").upsert(
  {
    id: userId,
    exploitation_id: exploitationId,
    role,
    nom_complet: fullName,
    langue: "fr",
  },
  { onConflict: "id" }
);

if (profileErr) {
  console.warn("user_profiles (vérifiez que la table existe):", profileErr.message);
} else {
  console.log("Profil lié à exploitation", exploitationId);
}

const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { error: signErr } = await anon.auth.signInWithPassword({ email, password });
if (signErr) {
  console.warn("Test connexion anon échoué:", signErr.message);
} else {
  console.log("Test connexion OK — connectez-vous sur http://localhost:3000/login");
}
