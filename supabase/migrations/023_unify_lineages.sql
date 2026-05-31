-- ═══════════════════════════════════════════════════════════════
-- LeadFarm Migration 023 — Schema Unification (Technical Debt Cleanup)
-- ═══════════════════════════════════════════════════════════════

-- Phase 1: Add tenant FK to lineage A tables that lack it
-- regions, zones, sites -> map to zone table in lineage C
ALTER TABLE zones ADD COLUMN IF NOT EXISTS identifiant_tenant INT REFERENCES tenant(identifiant_tenant);

-- Create view bridging lineage A stock to lineage C
CREATE OR REPLACE VIEW v_stock_unified AS
  SELECT
    m.id           AS mouvement_id,
    m.product_id,
    p.trade_name   AS nom_produit,
    m.quantity     AS quantite,
    m.movement_type AS type_mouvement,
    m.created_at,
    COALESCE(z.identifiant_tenant, 1) AS identifiant_tenant
  FROM movements m
  JOIN products p ON p.id = m.product_id
  LEFT JOIN sites s    ON s.id = m.site_id
  LEFT JOIN zones z_a  ON z_a.id = s.zone_id
  LEFT JOIN ZONE z     ON z.nom_zone = z_a.name -- bridge by name
;

-- Phase 2: Deprecate lineage B in favor of C
-- Add FK columns from lineage B parcelles -> lineage C parcelle
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS parcelle_c_id INT REFERENCES PARCELLE(identifiant_parcelle);

-- Run data migration script to link existing UUID parcelles to INT parcelle rows
DO $$
DECLARE
  p_row RECORD;
  c_id INT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'parcelles') THEN
    FOR p_row IN SELECT id, nom FROM parcelles LOOP
      -- Find or create Lineage C PARCELLE for it
      SELECT identifiant_parcelle INTO c_id FROM PARCELLE WHERE nom_parcelle = p_row.nom LIMIT 1;
      
      IF c_id IS NULL THEN
        INSERT INTO PARCELLE (nom_parcelle, superficie_hectares, identifiant_zone)
        VALUES (p_row.nom, 5.0, (SELECT identifiant_zone FROM ZONE LIMIT 1))
        RETURNING identifiant_parcelle INTO c_id;
      END IF;
      
      UPDATE parcelles SET parcelle_c_id = c_id WHERE id = p_row.id;
    END LOOP;
  END IF;
END $$;
