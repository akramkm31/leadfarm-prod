-- ════════════════════════════════════════════════════════════════════
-- LeadFarm — Lot 2 : données réelles PDF (Groupe Lechehab / Les Frères Lacheb)
-- Stations + secteurs, corrections catégories produits, produits manquants,
-- achats 2026, snapshot stock 11/06/2026, plan de fertigation (coefficients × ha).
-- Source : 5 PDF exploitation (fiches produits, entrées-sorties, inventaire,
--          plan fertigation, données techniques stations).
-- Date import : 2026-06-15
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Corriger catégories produits déjà en base (025 → AUTRE par défaut) ──
update lf_products set category = 'ENGRAIS'               where name = 'BLACK JAK'            and category = 'AUTRE';
update lf_products set category = 'ENGRAIS'               where name = 'Blackjak'             and category = 'AUTRE';
update lf_products set category = 'ENGRAIS'               where name = 'GREEN ZINC'           and category = 'AUTRE';
update lf_products set category = 'ENGRAIS'               where name = 'FERTIGEL 00.52.34'    and category = 'AUTRE';
update lf_products set category = 'ENGRAIS', unit = 'kg'  where name = 'NITRATE DE MAGNESIUM' and category = 'AUTRE';

-- ── 2. Produits clés manquants (PDF "Fiche produits") ───────────────────────
insert into lf_products (name, category, unit, composition, dar_days) values
  ('BELLIS',              'FONGICIDE',   'kg', 'Boscalid 252 g/kg, Pyraclostrobine 128 g/kg', 7),
  ('BOUILLIE BORDELAISE', 'FONGICIDE',   'kg', 'Cuivre (hydroxyde de cuivre) 190 g/L',        14),
  ('CORAGEN',             'INSECTICIDE', 'l',  'Cyantraniliprole 200 g/l',                    7),
  ('AGROIL BLUE',         'INSECTICIDE', 'l',  'Huile de paraffine 83%',                      null),
  ('LAIT DE CHAUX',       'DORMANCE',    'kg', 'Hydroxyde de calcium Ca(OH)2',                null),
  ('ACIDE PHOSPHORIQUE',  'ACIDE',       'l',  'H3PO4 75%',                                   null),
  ('ACIDE NITRIQUE',      'ACIDE',       'l',  'HNO3 55%',                                    null),
  ('Agrizote',            'ACIDE',       'l',  'Acide Nitrique 55% (Agrizote)',                null),
  ('Nitrate calcium',     'ENGRAIS',     'qx', 'Ca(NO3)2 — 15,5N + 26 CaO',                  null),
  ('Nitrate potassium',   'ENGRAIS',     'kg', 'KNO3 — 13N + 44 K2O',                        null),
  ('Nitrate magnesium',   'ENGRAIS',     'kg', 'Mg(NO3)2 — 11N + 16 MgO',                    null),
  ('Sulfate ammonium',    'ENGRAIS',     'kg', '(NH4)2SO4 — 21N + 24 SO3',                   null),
  ('Urea phosphate',      'ENGRAIS',     'kg', 'CO(NH2)2·H3PO4 — 17N + 44 P2O5',             null),
  ('DAP 18-44',           'ENGRAIS',     'qx', 'Diammonium phosphate 18N + 44 P2O5',          null),
  ('FER EDDHA',           'FER',         'kg', 'Fer EDDHA chélaté 6%',                        null)
on conflict (name, category) do nothing;

-- ── 3. Sites géographiques (parcelles exploitation Tenira / SBA) ─────────────
insert into lf_sites (name, zone, region, culture) values
  ('LA BASE 1',         'Tenira Est',    'Sidi Bel Abbès', 'a_pepins'),
  ('LA BASE 2',         'Tenira Est',    'Sidi Bel Abbès', 'a_pepins'),
  ('LA BASE 3',         'Tenira Est',    'Sidi Bel Abbès', 'a_pepins'),
  ('Maguer Grande',     'Tenira Nord',   'Sidi Bel Abbès', 'a_pepins'),
  ('25 Ha',             'Tenira Centre', 'Sidi Bel Abbès', 'a_pepins'),
  ('13 Ha Devil Gala',  'Tenira Centre', 'Sidi Bel Abbès', 'a_pepins'),
  ('2 Ha SYS V',        'Tenira Ouest',  'Sidi Bel Abbès', 'a_pepins'),
  ('HADJA FATMA',       'Tenira Ouest',  'Sidi Bel Abbès', 'a_pepins'),
  ('CARRIERE',          'Tenira Sud',    'Sidi Bel Abbès', 'a_pepins'),
  ('HJIRA PETITE',      'Tenira Sud',    'Sidi Bel Abbès', 'a_pepins'),
  ('Maguer Petite',     'Tenira Nord',   'Sidi Bel Abbès', 'a_pepins'),
  ('LYCEE',             'Tenira Centre', 'Sidi Bel Abbès', 'a_pepins'),
  ('HJIRA GRANDE',      'Tenira Sud',    'Sidi Bel Abbès', 'a_pepins')
on conflict (name) do nothing;

-- ── 4. Stations de fertigation (13 stations exploitation) ────────────────────
insert into lf_stations (name) values
  ('LA BASE 1'), ('LA BASE 2'), ('LA BASE 3'),
  ('Maguer Grande'), ('25 Ha'), ('13 Ha Devil Gala'),
  ('2 Ha SYS V'), ('HADJA FATMA'), ('CARRIERE'),
  ('HJIRA PETITE'), ('Maguer Petite'), ('LYCEE'), ('HJIRA GRANDE')
on conflict (name) do nothing;

-- ── 5. Secteurs (surfaces PDF plan de fertigation) ───────────────────────────
insert into lf_sectors (station_id, code, surface_ha)
select st.id, sec.code, sec.surface_ha
from lf_stations st
join (values
  ('CARRIERE',         'S1',  6.79),
  ('CARRIERE',         'S2',  7.30),
  ('25 Ha',            'S1',  5.33),
  ('Maguer Grande',    'S1', 13.00),
  ('13 Ha Devil Gala', 'S1', 13.00),
  ('2 Ha SYS V',       'S1',  2.00),
  ('LA BASE 1',        'S1', null),
  ('LA BASE 2',        'S1', null),
  ('LA BASE 3',        'S1', null),
  ('HADJA FATMA',      'S1', null),
  ('HJIRA PETITE',     'S1', null),
  ('Maguer Petite',    'S1', null),
  ('LYCEE',            'S1', null),
  ('HJIRA GRANDE',     'S1', null)
) as sec(station_name, code, surface_ha) on st.name = sec.station_name
on conflict (station_id, code) do nothing;

-- ── 6. Snapshot de stock physique — inventaire 11/06/2026 ────────────────────
insert into lf_stock_snapshots
  (snapshot_date, product_id, product_label, category, quantity, unit)
select
  '2026-06-11'::date,
  p.id,
  v.label,
  v.cat::lf_product_category,
  v.qty::numeric,
  v.u::lf_unit
from (values
  ('BELLIS',   'FONGICIDE', '960.2', 'kg'),
  ('Agrizote', 'ACIDE',     '2900',  'l')
) as v(label, cat, qty, u)
left join lf_products p on p.name = v.label;

-- ── 7. Achats 2026 (PDF "Fiche Entrées-Sorties") ─────────────────────────────
insert into lf_purchases
  (date, product_id, product_label, category, quantity, unit,
   supplier_id, supplier_label, expiry_date, source)
select
  v.dt::date,
  p.id,
  v.prod,
  v.cat::lf_product_category,
  v.qty::numeric,
  v.u::lf_unit,
  s.id,
  v.sup,
  nullif(v.exp, '')::date,
  'PDF import 2026'
from (values
  ('2026-01-15', 'LAIT DE CHAUX',      'DORMANCE',   '2650', 'kg',  'BLIDA',     ''),
  ('2026-03-01', 'BELLIS',             'FONGICIDE',   '960', 'kg',  'DEVAGRI',   '2028-03-01'),
  ('2026-06-01', 'CORAGEN',            'INSECTICIDE',  '12', 'l',   'SRID',      '2027-06-01'),
  ('2026-02-28', 'ACIDE PHOSPHORIQUE', 'ACIDE',      '2850', 'l',   'HYGINDUST', '2028-02-28'),
  ('2026-01-20', 'Nitrate calcium',    'ENGRAIS',     '504', 'qx',  'CASAP',     '2026-08-01')
) as v(dt, prod, cat, qty, u, sup, exp)
left join lf_products  p on p.name  = v.prod
left join lf_suppliers s on s.name  = v.sup;

-- ── 8. Plan de fertigation (dose = coeff × surface_ha) ───────────────────────
-- Coefficients hebdomadaires extraits du tableau PDF :
--   AN  = 0.01 L (fixe), AP × 2 L/ha, DAP × 10 qx/ha,
--   Blackjak × 1.5 L/ha, FER × 5 kg/ha, GZ × 2.5 L/ha,
--   NC × 17 qx/ha, NK × 12.5 kg/ha, NM × 3 kg/ha, SA × 3 kg/ha
do $$
declare
  r    record;
  pan  uuid; pap  uuid; pdap uuid; pbj  uuid; pfe  uuid;
  pgz  uuid; pnc  uuid; pnk  uuid; pnm  uuid; psa  uuid;
begin
  select id into pan  from lf_products where name = 'Agrizote'           limit 1;
  select id into pap  from lf_products where name = 'ACIDE PHOSPHORIQUE' limit 1;
  select id into pdap from lf_products where name = 'DAP 18-44'          limit 1;
  select id into pbj  from lf_products where name in ('Blackjak','BLACK JAK') order by name limit 1;
  select id into pfe  from lf_products where name = 'FER EDDHA'          limit 1;
  select id into pgz  from lf_products where name = 'GREEN ZINC'         limit 1;
  select id into pnc  from lf_products where name = 'Nitrate calcium'    limit 1;
  select id into pnk  from lf_products where name = 'Nitrate potassium'  limit 1;
  select id into pnm  from lf_products where name = 'Nitrate magnesium'  limit 1;
  select id into psa  from lf_products where name = 'Sulfate ammonium'   limit 1;

  for r in
    select st.id as sid, st.name as sname, sc.code, sc.surface_ha
    from lf_sectors sc
    join lf_stations st on st.id = sc.station_id
    where sc.surface_ha is not null
  loop
    insert into lf_fertigation_lines
      (station_id, station_label, sector_code, surface_ha, input_label, product_id, dose)
    values
      (r.sid, r.sname, r.code, r.surface_ha, 'AN',       pan,  0.01),
      (r.sid, r.sname, r.code, r.surface_ha, 'AP',       pap,  round((r.surface_ha * 2)::numeric,   3)),
      (r.sid, r.sname, r.code, r.surface_ha, 'DAP',      pdap, round((r.surface_ha * 10)::numeric,  3)),
      (r.sid, r.sname, r.code, r.surface_ha, 'Blackjak', pbj,  round((r.surface_ha * 1.5)::numeric, 3)),
      (r.sid, r.sname, r.code, r.surface_ha, 'FER',      pfe,  round((r.surface_ha * 5)::numeric,   3)),
      (r.sid, r.sname, r.code, r.surface_ha, 'GZ',       pgz,  round((r.surface_ha * 2.5)::numeric, 3)),
      (r.sid, r.sname, r.code, r.surface_ha, 'NC',       pnc,  round((r.surface_ha * 17)::numeric,  3)),
      (r.sid, r.sname, r.code, r.surface_ha, 'NK',       pnk,  round((r.surface_ha * 12.5)::numeric,3)),
      (r.sid, r.sname, r.code, r.surface_ha, 'NM',       pnm,  round((r.surface_ha * 3)::numeric,   3)),
      (r.sid, r.sname, r.code, r.surface_ha, 'SA',       psa,  round((r.surface_ha * 3)::numeric,   3));
  end loop;
end $$;
