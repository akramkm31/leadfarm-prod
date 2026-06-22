/**
 * LeadFarm RBAC — profils `user_profiles.role` (schéma Supabase actuel).
 * Les codes migration 011 (admin, expert, …) sont normalisés via ROLE_ALIASES.
 */
export const USER_ROLES = [
  "directeur",
  "responsable_technique",
  "agronome",
  "magasinier",
  "operateur",
  "auditeur",
  "consultant",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Capacités métier (une feature = un module ou une action sensible). */
export const FEATURES = [
  "dashboard",
  "parcelles.view",
  "parcelles.edit",
  "treatments.view",
  "treatments.plan",
  "treatments.execute",
  "registre",
  "trace",
  "campagnes",
  "stock.view",
  "stock.edit",
  "products.view",
  "products.edit",
  "suppliers.view",
  "suppliers.edit",
  "live",
  "satellite",
  "vision",
  "fertigation",
  "conformite",
  "audit",
  "alerts",
  "operators",
  "reports",
  "settings",
  "micro_zones",
  "protocoles",
  "maladies",
  "recoltes",
  "meteo",
  "resultats",
  "admin.roles",
] as const;

export type Feature = (typeof FEATURES)[number];

export interface UserAccessProfile {
  userId: string;
  role: UserRole;
  exploitationId: string | null;
  features: Feature[];
}
