import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async (req) => {
  const { event, user } = await req.json();

  // Create a Supabase client with the admin key
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Fetch the user's role and exploitation ID
  const { data: u, error } = await supabaseAdmin
    .from("UTILISATEUR")
    .select("identifiant_role, identifiant_exploitation, role:role(code_role)")
    .eq("adresse_email", user.email)
    .single();

  if (error || !u) {
    console.error("Error fetching user data for JWT hook:", error);
    return new Response(JSON.stringify({ claims: {} }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Populate custom claims
  const claims = {
    role: u.role?.code_role || "viewer",
    exploitation_id: u.identifiant_exploitation,
    user_id: u.identifiant_utilisateur,
  };

  console.log(`Generated claims for ${user.email}:`, claims);

  return new Response(JSON.stringify({ claims }), {
    headers: { "Content-Type": "application/json" },
  });
});
