/**
 * ADR-15 — La table `regions` est la source canonique pour l’UI et `treatments.parcelle_id`.
 * La table `parcelles` (MCD) est synchronisée avec le même UUID pour plantations / traçabilité.
 */
export const CANONICAL_PARCELLE_TABLE = "regions" as const;

export const DEFAULT_EXPLOITATION_ID = "a0000000-0000-4000-8000-000000000001";
