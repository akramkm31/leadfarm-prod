import type { UserRole } from "./types";

export const ROLE_LABELS: Record<UserRole, string> = {
  directeur: "Directeur d'exploitation",
  responsable_technique: "Responsable technique",
  magasinier: "Magasinier phyto",
  operateur: "Opérateur terrain",
  auditeur: "Auditeur",
  consultant: "Consultant Externe",
};

/** Codes alternatifs (migration 011, seed legacy) → profil canonique. */
export const ROLE_ALIASES: Record<string, UserRole> = {
  directeur: "directeur",
  responsable_technique: "responsable_technique",
  magasinier: "magasinier",
  operateur: "operateur",
  auditeur: "auditeur",
  consultant: "consultant",
  admin: "directeur",
  expert: "responsable_technique",
  operator: "operateur",
  chauffeur: "operateur",
  stock: "magasinier",
  viewer: "auditeur",
  auditor: "auditeur",
};

export function normalizeRole(raw: string | null | undefined): UserRole {
  if (!raw) return "operateur";
  const key = raw.trim().toLowerCase();
  return ROLE_ALIASES[key] ?? "operateur";
}
