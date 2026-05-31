-- ═══════════════════════════════════════════════════════════════
-- LeadFarm Migration 022 — Projected Stock Function & Bridges
-- ═══════════════════════════════════════════════════════════════

-- Create the mouvement_stock table
CREATE TABLE IF NOT EXISTS mouvement_stock (
  id               SERIAL PRIMARY KEY,
  id_produit       INT NOT NULL REFERENCES PRODUIT_PHYTOSANITAIRE(identifiant_produit),
  id_tenant        INT NOT NULL REFERENCES tenant(identifiant_tenant) ON DELETE CASCADE,
  type_mouvement   TEXT NOT NULL CHECK (type_mouvement IN ('ENTREE', 'SORTIE')),
  quantite         NUMERIC NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill from products/movements if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'movements') THEN
    -- Try to backfill from movements (Lineage A) to mouvement_stock
    INSERT INTO mouvement_stock (id_produit, id_tenant, type_mouvement, quantite, created_at)
    SELECT 
      COALESCE((SELECT identifiant_produit FROM PRODUIT_PHYTOSANITAIRE LIMIT 1), 1), -- fallback
      1,
      CASE WHEN m.movement_type = 'entree' THEN 'ENTREE' ELSE 'SORTIE' END,
      m.quantity,
      m.created_at
    FROM movements m
    WHERE m.product_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 2. Projected Stock Function
CREATE OR REPLACE FUNCTION get_projected_stock(
  p_tenant_id   INT,
  p_produit_id  INT,
  p_date_limite DATE
)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT
    COALESCE(
      (SELECT SUM(CASE WHEN type_mouvement = 'ENTREE' THEN quantite ELSE -quantite END)
       FROM mouvement_stock
       WHERE id_produit = p_produit_id AND id_tenant = p_tenant_id),
      0
    )
    -
    COALESCE(
      (SELECT SUM((r->>'quantite')::NUMERIC)
       FROM planning_operationnel po,
            jsonb_array_elements(po.produits_requis) AS r
       WHERE (r->>'id_produit')::INT = p_produit_id
         AND po.date_prevue <= p_date_limite
         AND po.statut = 'planifie'),
      0
    );
$$;
