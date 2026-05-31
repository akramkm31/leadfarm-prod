import { createServerClient } from "@/lib/supabase/server";

export async function getConsultantTenants(userId: number): Promise<number[]> {
  const supabase = createServerClient() as any;
  const { data } = await supabase
    .from("tenant_utilisateur")
    .select("identifiant_tenant, role")
    .eq("identifiant_utilisateur", userId)
    .eq("statut_acces", "actif");
  
  // Since role is directly a column on tenant_utilisateur (bridge table),
  // we filter by it.
  const filtered = (data ?? []).filter((r: any) => r.role === "CONSULTANT" || r.role === "consultant");
  return filtered.map((r: any) => r.identifiant_tenant);
}

export async function assertConsultantAccess(
  userId: number,
  tenantId: number
): Promise<void> {
  const tenants = await getConsultantTenants(userId);
  if (!tenants.includes(tenantId)) {
    throw new Error(`Consultant ${userId} has no access to tenant ${tenantId}`);
  }
}
