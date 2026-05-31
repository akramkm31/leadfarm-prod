import type { Feature, UserRole } from "./types";

/**
 * Matrice rôle → fonctionnalités.
 * Source de vérité unique pour UI, proxy et APIs.
 */
export const ROLE_FEATURES: Record<UserRole, readonly Feature[]> = {

  // ── Directeur ─────────────────────────────────────────────────
  // Farm owner — full access including user management
  directeur: [
    "dashboard",
    "parcelles.view", "parcelles.edit",
    "treatments.view", "treatments.edit",
    "registre", "trace", "campagnes",
    "stock.view", "stock.edit",
    "products", "suppliers",
    "live", "satellite", "vision", "fertigation",
    "conformite", "audit",
    "alerts", "operators", "reports", "settings",
    "micro_zones", "protocoles", "maladies",
    "meteo",
    "admin.roles",
  ],

  // ── Responsable Technique ─────────────────────────────────────
  // Technical manager — full operational control, no user admin
  responsable_technique: [
    "dashboard",
    "parcelles.view", "parcelles.edit",
    "treatments.view", "treatments.edit",
    "registre", "trace", "campagnes",
    "stock.view", "stock.edit",
    "products", "suppliers",
    "live", "satellite", "vision", "fertigation",
    "conformite", "audit",
    "alerts", "operators", "reports", "settings",
    "micro_zones", "protocoles", "maladies",
    "meteo",
  ],

  // ── Magasinier ────────────────────────────────────────────────
  // Storekeeper — stock management only
  // Can view treatments to prepare required products
  // Cannot see farm map, traceability, or field operations
  magasinier: [
    "dashboard",
    "treatments.view",
    "stock.view", "stock.edit",
    "products", "suppliers",
    "alerts", "reports",
    "settings",
  ],

  // ── Opérateur ─────────────────────────────────────────────────
  // Field worker — executes treatments, no strategic access
  // Can update treatment status but not edit parcelle definitions
  // No satellite (strategic), no operators list (not their concern)
  operateur: [
    "dashboard",
    "parcelles.view",
    "treatments.view", "treatments.edit",
    "trace",
    "live", "vision", "fertigation",
    "alerts", "meteo",
    "micro_zones",
    "settings",
  ],

  // ── Auditeur ──────────────────────────────────────────────────
  // Compliance auditor — read-only across all compliance surfaces
  // No supplier contracts, no field editing
  auditeur: [
    "dashboard",
    "parcelles.view",
    "treatments.view",
    "registre", "trace",
    "stock.view", "products",
    "conformite", "audit",
    "alerts", "operators", "reports",
    "maladies", "meteo",
  ],

  // ── Consultant ────────────────────────────────────────────────
  // External agronomic expert — strategic analysis, plans & protocols
  // No internal SCD2 audit trail, no operational alerts
  consultant: [
    "dashboard",
    "parcelles.view",
    "treatments.view",
    "registre", "trace",
    "campagnes",
    "conformite",
    "reports",
    "micro_zones", "protocoles", "maladies",
    "meteo",
    "settings",
  ],

};

/** Routes API → feature requise (méthode sensible). */
export const API_FEATURE_RULES: {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  pathPrefix: string;
  feature: Feature;
}[] = [
  { method: "POST", pathPrefix: "/api/v1/simulation/run", feature: "simulation" },
  { method: "POST", pathPrefix: "/api/v1/treatments", feature: "treatments.edit" },
  { method: "POST", pathPrefix: "/api/v1/movements", feature: "stock.edit" },
  { method: "POST", pathPrefix: "/api/v1/products", feature: "products" },
  { method: "POST", pathPrefix: "/api/v1/suppliers", feature: "suppliers" },
  { method: "POST", pathPrefix: "/api/v1/operators", feature: "operators" },
  { method: "POST", pathPrefix: "/api/v1/parcelles", feature: "parcelles.edit" },
  { method: "POST", pathPrefix: "/api/v1/plantations", feature: "campagnes" },
  { method: "POST", pathPrefix: "/api/v1/campagnes", feature: "campagnes" },
  { method: "POST", pathPrefix: "/api/v1/import", feature: "stock.edit" },
  { method: "GET", pathPrefix: "/api/v1/stock", feature: "stock.view" },
  { method: "GET", pathPrefix: "/api/v1/treatments", feature: "treatments.view" },
  { method: "GET", pathPrefix: "/api/v1/parcelles", feature: "parcelles.view" },
];
