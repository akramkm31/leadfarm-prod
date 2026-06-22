-- =============================================================
-- 028 — App-facing enriched views over the real Lechehab data
-- Powers the whole app (catalogue, stock, dashboard) from lf_* only.
-- No monetary columns exist in the source data → no price/value here.
-- =============================================================

-- Enriched product catalogue: product + derived stock (reste) + expiry +
-- resolved active ingredient + last purchase + latest snapshot + status.
CREATE OR REPLACE VIEW lf_products_full AS
SELECT
  p.id,
  p.name,
  p.category,
  p.subcategory,
  COALESCE(NULLIF(p.active_ingredient_text, ''), ai.name) AS active_ingredient,
  p.composition,
  p.teneur_ma,
  p.formulation,
  p.famille_chimique,
  p.unit,
  p.dar_days,
  p.cible,
  COALESCE(sl.reste, 0)            AS reste,
  COALESCE(sl.is_negative, false)  AS is_negative,
  pur.next_expiry,
  pur.total_purchased,
  pur.last_purchase_date,
  pur.last_supplier,
  pur.last_supplier_id,
  snap.snapshot_qty,
  CASE
    WHEN COALESCE(sl.is_negative, false) THEN 'negative'
    WHEN COALESCE(sl.reste, 0) <= 0      THEN 'critical'
    ELSE 'ok'
  END AS status,
  p.exploitation_id
FROM lf_products p
LEFT JOIN lf_active_ingredients ai ON ai.id = p.active_ingredient_id
LEFT JOIN lf_stock_levels sl       ON sl.product_id = p.id
LEFT JOIN LATERAL (
  SELECT
    min(pu.expiry_date) FILTER (WHERE pu.expiry_date >= CURRENT_DATE) AS next_expiry,
    sum(pu.quantity)                                                  AS total_purchased,
    max(pu.date)                                                      AS last_purchase_date,
    (array_agg(pu.supplier_label ORDER BY pu.date DESC NULLS LAST))[1] AS last_supplier,
    (array_agg(pu.supplier_id ORDER BY pu.date DESC NULLS LAST))[1]    AS last_supplier_id
  FROM lf_purchases pu
  WHERE pu.product_id = p.id
) pur ON true
LEFT JOIN LATERAL (
  SELECT s.quantity AS snapshot_qty
  FROM lf_stock_snapshots s
  WHERE s.product_id = p.id
  ORDER BY s.snapshot_date DESC
  LIMIT 1
) snap ON true;

GRANT SELECT ON lf_products_full TO anon, authenticated;

-- Stock value/quantity rollup by category (quantity only — no prices in source).
CREATE OR REPLACE VIEW lf_stock_by_category AS
SELECT
  category,
  count(*)                                  AS product_count,
  sum(GREATEST(reste, 0))                   AS qty_positive,
  count(*) FILTER (WHERE is_negative)       AS negative_count,
  count(*) FILTER (WHERE reste = 0)         AS empty_count
FROM lf_stock_levels
GROUP BY category;

GRANT SELECT ON lf_stock_by_category TO anon, authenticated;

-- Suppliers enriched with purchase-derived delivery activity.
CREATE OR REPLACE VIEW lf_suppliers_full AS
SELECT
  s.id,
  s.name,
  s.role,
  COALESCE(pu.delivery_count, 0)   AS delivery_count,
  COALESCE(pu.product_count, 0)    AS product_count,
  COALESCE(pu.total_quantity, 0)   AS total_quantity,
  pu.last_delivery,
  s.exploitation_id
FROM lf_suppliers s
LEFT JOIN (
  SELECT
    supplier_id,
    count(*)                              AS delivery_count,
    count(DISTINCT product_id)            AS product_count,
    sum(quantity)                         AS total_quantity,
    max(date)                             AS last_delivery
  FROM lf_purchases
  WHERE supplier_id IS NOT NULL
  GROUP BY supplier_id
) pu ON pu.supplier_id = s.id;

GRANT SELECT ON lf_suppliers_full TO anon, authenticated;
