-- ═══════════════════════════════════════════════════════════════
-- LeadFarm 017 — Documentation chaîne simulation démo
-- Les données sont injectées via :
--   npm run seed:demo-simulation
--   POST /api/v1/simulation/run (UI /simulation)
-- IDs stables : voir src/lib/demo-simulation.ts (DEMO_IDS)
-- ═══════════════════════════════════════════════════════════════

COMMENT ON TABLE campagnes IS 'Campagnes liées exploitations ; chaîne démo via simulation';
COMMENT ON TABLE plantations IS 'SCD2 cultures sur parcelles ; parcelle_id = regions.id (ADR-15)';
