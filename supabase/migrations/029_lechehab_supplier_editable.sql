-- =============================================================
-- 029 — Make lf_suppliers editable from the app (carnet fournisseurs)
-- Adds contact columns so the Fournisseurs page add/edit persists to lf_*.
-- =============================================================
ALTER TABLE lf_suppliers
  ADD COLUMN IF NOT EXISTS phone               text,
  ADD COLUMN IF NOT EXISTS email               text,
  ADD COLUMN IF NOT EXISTS address             text,
  ADD COLUMN IF NOT EXISTS city                text,
  ADD COLUMN IF NOT EXISTS wilaya              text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS active              boolean NOT NULL DEFAULT true;

-- Recreate the enriched view to expose the new editable columns.
DROP VIEW IF EXISTS lf_suppliers_full;
CREATE VIEW lf_suppliers_full AS
SELECT
  s.id,
  s.name,
  s.role,
  s.phone,
  s.email,
  s.address,
  s.city,
  s.wilaya,
  s.registration_number,
  s.active,
  COALESCE(pu.delivery_count, 0)   AS delivery_count,
  COALESCE(pu.product_count, 0)    AS product_count,
  COALESCE(pu.total_quantity, 0)   AS total_quantity,
  pu.last_delivery,
  s.exploitation_id
FROM lf_suppliers s
LEFT JOIN (
  SELECT
    supplier_id,
    count(*)                   AS delivery_count,
    count(DISTINCT product_id) AS product_count,
    sum(quantity)              AS total_quantity,
    max(date)                  AS last_delivery
  FROM lf_purchases
  WHERE supplier_id IS NOT NULL
  GROUP BY supplier_id
) pu ON pu.supplier_id = s.id;

GRANT SELECT ON lf_suppliers_full TO anon, authenticated;
