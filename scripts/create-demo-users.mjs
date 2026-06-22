/**
 * Creates 6 demo accounts, one per role.
 * Run: node scripts/create-demo-users.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EXPLOITATION_ID = "a0000000-0000-4000-8000-000000000001";
const PASSWORD = "LeadFarm2026!";

const DEMO_ACCOUNTS = [
  { email: "directeur@leadfarm.dz",    name: "Akram Khelifa",    role: "directeur" },
  { email: "tech@leadfarm.dz",          name: "Karim Benali",     role: "responsable_technique" },
  { email: "magasin@leadfarm.dz",       name: "Sofiane Hadj",     role: "magasinier" },
  { email: "operateur@leadfarm.dz",     name: "Lyes Mansour",     role: "operateur" },
  { email: "auditeur@leadfarm.dz",      name: "Sara Meziani",     role: "auditeur" },
  { email: "consultant@leadfarm.dz",    name: "Nabil Bouzidi",    role: "consultant" },
];

async function adminFetch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function listUsers() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
  });
  return res.json();
}

async function updateUser(userId, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function upsertProfile(userId, account) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?on_conflict=id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: userId,
      exploitation_id: EXPLOITATION_ID,
      role: account.role,
      nom_complet: account.name,
      langue: "fr",
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    return { error: t };
  }
  return { ok: true };
}

async function main() {
  console.log("Fetching existing users...");
  const { users, error: listErr } = await listUsers();
  if (listErr) { console.error("listUsers error:", listErr); process.exit(1); }

  const byEmail = Object.fromEntries((users ?? []).map(u => [u.email?.toLowerCase(), u]));

  for (const account of DEMO_ACCOUNTS) {
    const existing = byEmail[account.email.toLowerCase()];
    let userId;

    if (existing) {
      const updated = await updateUser(existing.id, { password: PASSWORD, email_confirm: true });
      userId = existing.id;
      if (updated.id) console.log(`  UPDATED  ${account.email}`);
      else console.log(`  UPDATE?  ${account.email} — ${JSON.stringify(updated).slice(0, 80)}`);
    } else {
      const created = await adminFetch("users", {
        email: account.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: account.name },
      });
      userId = created.id;
      if (created.id) console.log(`  CREATED  ${account.email}`);
      else { console.error(`  FAILED   ${account.email} — ${JSON.stringify(created).slice(0, 120)}`); continue; }
    }

    const profileRes = await upsertProfile(userId, account);
    if (profileRes.error) console.warn(`    profile error: ${profileRes.error.slice(0, 80)}`);
    else console.log(`    profile linked (${account.role})`);
  }

  console.log("\nDone. All accounts use password: LeadFarm2026!");
}

main().catch(console.error);
