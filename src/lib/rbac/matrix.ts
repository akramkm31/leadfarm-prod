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
    "treatments.view", "treatments.plan", "treatments.execute",
    "registre", "trace", "campagnes",
    "stock.view", "stock.edit",
    "products.view", "products.edit",
    "suppliers.view", "suppliers.edit",
    "live", "satellite", "vision",
    "fertigation",
    "conformite", "audit",
    "alerts", "operators", "reports", "settings",
    "micro_zones", "protocoles", "maladies",
    "meteo", "recoltes", "resultats",
    "admin.roles",
  ],

  // ── Responsable Technique ─────────────────────────────────────
  // Technical manager — full AGRONOMIC/operational control.
  // No user admin (directeur), no purchasing (suppliers = directeur/magasinier),
  // no financial outcomes (recoltes/resultats = directeur/consultant).
  // Separation of duties: cannot run the full purchase cycle alone.
  responsable_technique: [
    "dashboard",
    "parcelles.view", "parcelles.edit",
    "treatments.view", "treatments.plan", "treatments.execute",
    "registre", "trace", "campagnes",
    "stock.view", "stock.edit",
    "products.view", "products.edit",
    "suppliers.view",
    "live", "satellite", "vision",
    "fertigation",
    "conformite", "audit",
    "alerts", "operators", "reports", "settings",
    "micro_zones", "protocoles", "maladies",
    "meteo",
  ],

  // ── Agronome ──────────────────────────────────────────────────
  // In-house agronomist — plans treatments, analyses parcelles, protocols,
  // diseases, satellite, AI vision. Read-only stock (dosage ref).
  // No field execution, no purchasing, no stock edits, no user admin.
  agronome: [
    "dashboard",
    "parcelles.view", "parcelles.edit",
    "treatments.view", "treatments.plan",
    "registre", "trace", "campagnes",
    "stock.view",
    "products.view",
    "live", "satellite", "vision",
    "fertigation",
    "alerts", "reports",
    "micro_zones", "protocoles", "maladies",
    "meteo", "resultats",
    "settings",
  ],

  // ── Magasinier ────────────────────────────────────────────────
  // Storekeeper — stock management only
  // Can view treatments to prepare required products
  // Cannot see farm map, traceability, or field operations
  magasinier: [
    "dashboard",
    "treatments.view",
    "stock.view", "stock.edit",
    "products.view", "products.edit",
    "suppliers.view", "suppliers.edit",
    "fertigation",
    "alerts", "reports",
    "settings",
  ],

  // ── Opérateur ─────────────────────────────────────────────────
  // Field worker — EXECUTES treatments only (status + real conditions).
  // Cannot PLAN treatments (product/dose = agronomic decision → RT/directeur).
  // Cannot edit parcelle definitions. No satellite, no operators list.
  operateur: [
    "dashboard",
    "parcelles.view",
    "treatments.view", "treatments.execute",
    "registre", "trace",
    "live", "vision",
    "alerts", "meteo",
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
    "stock.view", "products.view",
    "fertigation",
    "conformite", "audit",
    "alerts", "operators", "reports",
    "maladies", "meteo",
    "settings",
  ],

  // ── Consultant ────────────────────────────────────────────────
  // External agronomic expert — strategic analysis, plans & protocols
  // Read-only outcomes (recoltes/resultats) + satellite vigour for advisory
  // No internal SCD2 audit trail, no operational alerts
  consultant: [
    "dashboard",
    "parcelles.view",
    "treatments.view",
    "registre", "trace",
    "stock.view",
    "satellite",
    "conformite",
    "reports",
    "protocoles", "maladies",
    "meteo", "recoltes", "resultats",
    "settings",
  ],

};

/** Routes API → feature requise (méthode sensible). */
export const API_FEATURE_RULES: {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  pathPrefix: string;
  feature: Feature;
}[] = [
  { method: "POST", pathPrefix: "/api/v1/treatments/", feature: "treatments.execute" },
  { method: "POST", pathPrefix: "/api/v1/treatments", feature: "treatments.plan" },
  { method: "POST", pathPrefix: "/api/v1/movements", feature: "stock.edit" },
  { method: "POST", pathPrefix: "/api/v1/products", feature: "products.edit" },
  { method: "POST", pathPrefix: "/api/v1/suppliers", feature: "suppliers.edit" },
  { method: "GET", pathPrefix: "/api/v1/products", feature: "products.view" },
  { method: "GET", pathPrefix: "/api/v1/suppliers", feature: "suppliers.view" },
  { method: "POST", pathPrefix: "/api/v1/operators", feature: "operators" },
  { method: "POST", pathPrefix: "/api/v1/parcelles", feature: "parcelles.edit" },
  { method: "DELETE", pathPrefix: "/api/v1/parcelles", feature: "parcelles.edit" },
  { method: "POST", pathPrefix: "/api/v1/plantations", feature: "campagnes" },
  { method: "POST", pathPrefix: "/api/v1/campagnes", feature: "campagnes" },
  { method: "POST", pathPrefix: "/api/v1/import", feature: "stock.edit" },
  { method: "GET", pathPrefix: "/api/v1/stock", feature: "stock.view" },
  { method: "GET", pathPrefix: "/api/v1/stock/checklist", feature: "stock.view" },
  { method: "POST", pathPrefix: "/api/v1/stock/checklist", feature: "stock.edit" },
  { method: "GET", pathPrefix: "/api/v1/treatments", feature: "treatments.view" },
  { method: "GET", pathPrefix: "/api/v1/parcelles", feature: "parcelles.view" },
  { method: "GET", pathPrefix: "/api/v1/satellite-data/parcelle", feature: "satellite" },
  { method: "GET", pathPrefix: "/api/v1/satellite-data/preview", feature: "satellite" },
  { method: "GET", pathPrefix: "/api/v1/satellite-data/history", feature: "satellite" },
  { method: "GET", pathPrefix: "/api/v1/satellite-data", feature: "satellite" },
  { method: "POST", pathPrefix: "/api/v1/satellite-data/analyze", feature: "satellite" },
  { method: "GET", pathPrefix: "/api/v1/satellite-alerts", feature: "satellite" },
  { method: "PATCH", pathPrefix: "/api/v1/satellite-alerts", feature: "satellite" },
  { method: "POST", pathPrefix: "/api/v1/satellite-ingest", feature: "satellite" },
  { method: "GET", pathPrefix: "/api/v1/recoltes", feature: "recoltes" },
  { method: "GET", pathPrefix: "/api/v1/resultats", feature: "resultats" },
  { method: "GET", pathPrefix: "/api/v1/protocoles", feature: "protocoles" },
  { method: "PATCH", pathPrefix: "/api/v1/treatments", feature: "treatments.plan" },
  { method: "PUT", pathPrefix: "/api/v1/treatments", feature: "treatments.plan" },
  { method: "DELETE", pathPrefix: "/api/v1/treatments", feature: "treatments.plan" },
  { method: "POST", pathPrefix: "/api/v1/admin", feature: "admin.roles" },
  { method: "GET", pathPrefix: "/api/v1/admin", feature: "admin.roles" },
  { method: "GET", pathPrefix: "/api/v1/fertigations", feature: "fertigation" },
  { method: "POST", pathPrefix: "/api/v1/fertigations", feature: "fertigation" },
  { method: "GET", pathPrefix: "/api/v1/fertigation-plan", feature: "fertigation" },
  { method: "POST", pathPrefix: "/api/v1/vision/analyze", feature: "vision" },
  { method: "POST", pathPrefix: "/api/v1/detections", feature: "vision" },
  { method: "GET", pathPrefix: "/api/v1/maladies", feature: "maladies" },
  { method: "POST", pathPrefix: "/api/v1/maladies", feature: "maladies" },
  { method: "POST", pathPrefix: "/api/v1/camera", feature: "vision" },
  { method: "GET", pathPrefix: "/api/v1/trace", feature: "trace" },
  { method: "GET", pathPrefix: "/api/v1/alerts", feature: "alerts" },
  { method: "POST", pathPrefix: "/api/v1/alerts", feature: "alerts" },
  { method: "POST", pathPrefix: "/api/v1/planning", feature: "treatments.plan" },
  { method: "PATCH", pathPrefix: "/api/v1/planning", feature: "treatments.plan" },
  { method: "GET", pathPrefix: "/api/v1/planning", feature: "treatments.plan" },
  { method: "POST", pathPrefix: "/api/v1/plans", feature: "treatments.plan" },
  { method: "PATCH", pathPrefix: "/api/v1/plans", feature: "treatments.plan" },
  { method: "GET", pathPrefix: "/api/v1/operators", feature: "operators" },
  { method: "GET", pathPrefix: "/api/v1/stats", feature: "dashboard" },
  { method: "GET", pathPrefix: "/api/v1/plantations", feature: "campagnes" },
  { method: "PATCH", pathPrefix: "/api/v1/plantations", feature: "campagnes" },
  { method: "GET", pathPrefix: "/api/v1/movements", feature: "stock.view" },
  { method: "GET", pathPrefix: "/api/v1/meteo", feature: "meteo" },
  { method: "GET", pathPrefix: "/api/v1/treatments/", feature: "treatments.view" },
];
