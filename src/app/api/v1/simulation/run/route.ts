import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, json } from "@/lib/api-helpers";
import { runDemoSimulation } from "@/lib/demo-simulation";

export async function POST(req: NextRequest) {
  const { error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return json(
      {
        success: false,
        error:
          "SUPABASE_SERVICE_ROLE_KEY manquante — ajoutez-la dans .env.local pour lancer la simulation.",
      },
      503
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await runDemoSimulation(admin);
  return json(
    {
      success: result.ok,
      steps: result.steps,
      links: result.links,
    },
    result.ok ? 200 : 500
  );
}
