-- =============================================================
-- 030 — Use the RESTE_EN_STOCK 11.06.2026 snapshot as the real stock
-- The movement-ledger reste (lf_stock_levels) undercounts (incomplete
-- movement history → only 131 non-zero). The dated physical snapshot
-- (lf_stock_snapshots, 203 non-zero) is the ground truth the farm keeps.
-- reste := COALESCE(snapshot, ledger, 0). Ledger negatives kept as a
-- data-quality flag (is_negative) per the "never silently fix" rule.
-- =============================================================

-- 1) Catalogue + real stock (snapshot-preferred), used app-wide.
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
  COALESCE(snap.snapshot_qty, sl.reste, 0)  AS reste,
  COALESCE(sl.is_negative, false)           AS is_negative,
  pur.next_expiry,
  pur.total_purchased,
  pur.last_purchase_date,
  pur.last_supplier,
  pur.last_supplier_id,
  snap.snapshot_qty,
  CASE
    WHEN COALESCE(sl.is_negative, false)              THEN 'negative'
    WHEN COALESCE(snap.snapshot_qty, sl.reste, 0) = 0 THEN 'empty'
    ELSE 'ok'
  END AS status,
  p.exploitation_id,
  sl.reste AS ledger_reste
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

-- 2) Dedicated stock view for the "Stock réel" tab (LfStockLevel shape).
CREATE OR REPLACE VIEW lf_stock_real AS
SELECT
  p.id AS product_id,
  p.name,
  p.category,
  p.subcategory,
  p.unit,
  COALESCE(NULLIF(p.active_ingredient_text, ''), ai.name) AS active_ingredient,
  COALESCE(snap.snapshot_qty, sl.reste, 0) AS reste,
  COALESCE(sl.is_negative, false)          AS is_negative,
  snap.snapshot_qty,
  sl.reste AS ledger_reste
FROM lf_products p
LEFT JOIN lf_active_ingredients ai ON ai.id = p.active_ingredient_id
LEFT JOIN lf_stock_levels sl       ON sl.product_id = p.id
LEFT JOIN LATERAL (
  SELECT s.quantity AS snapshot_qty
  FROM lf_stock_snapshots s
  WHERE s.product_id = p.id
  ORDER BY s.snapshot_date DESC
  LIMIT 1
) snap ON true;

GRANT SELECT ON lf_stock_real TO anon, authenticated;
