import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const path = resolve(process.cwd(), ".env.local");
if (existsSync(path)) {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log("URL:", url);
console.log("KEY prefix:", key?.slice(0, 20) + "...");

const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await c.auth.admin.listUsers({ perPage: 5 });
if (error) console.error("ERROR:", error.message);
else console.log("OK — existing users:", data.users.map(u => `${u.email} (${u.id.slice(0,8)})`).join("\n  "));
