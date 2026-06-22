-- ════════════════════════════════════════════════════════════════════
-- Groupe Lechehab — tables d'import complet (au-delà du référentiel) :
-- achats/entrées (péremption), snapshots de stock, besoins, fertigation.
-- ════════════════════════════════════════════════════════════════════

-- Achats / Entrées (avec péremption + fournisseur)
create table if not exists lf_purchases (
  id uuid primary key default gen_random_uuid(),
  date date,
  product_id uuid references lf_products(id) on delete set null,
  product_label text,
  active_ingredient_text text,
  category lf_product_category,
  quantity numeric,
  unit lf_unit,
  supplier_id uuid references lf_suppliers(id) on delete set null,
  supplier_label text,
  expiry_date date,
  source text,
  created_at timestamptz not null default now()
);
create index if not exists idx_lf_purchases_product on lf_purchases(product_id);
create index if not exists idx_lf_purchases_date on lf_purchases(date);

-- Snapshots de stock (RESTE_EN_STOCK daté)
create table if not exists lf_stock_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  product_id uuid references lf_products(id) on delete set null,
  product_label text,
  active_ingredient_text text,
  category lf_product_category,
  composition text,
  quantity numeric,
  unit lf_unit,
  created_at timestamptz not null default now()
);
create index if not exists idx_lf_snap_date on lf_stock_snapshots(snapshot_date);

-- Besoins / Approvisionnement (RESTE DES BESOINS)
create table if not exists lf_needs (
  id uuid primary key default gen_random_uuid(),
  campaign_year int not null default 2026,
  category lf_product_category,
  active_ingredient_text text,
  product_label text,
  unit lf_unit,
  quantity_needed numeric,
  created_at timestamptz not null default now()
);

-- Lignes de plan de fertigation (Station × Secteur × intrant)
create table if not exists lf_fertigation_lines (
  id uuid primary key default gen_random_uuid(),
  station_id uuid references lf_stations(id) on delete cascade,
  station_label text,
  sector_code text,
  surface_ha numeric,
  input_label text,
  product_id uuid references lf_products(id) on delete set null,
  dose numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_lf_fert_station on lf_fertigation_lines(station_id);

-- RLS permissif + grants (tables SQL brut)
do $$
declare t text;
begin
  foreach t in array array['lf_purchases','lf_stock_snapshots','lf_needs','lf_fertigation_lines']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "lf allow all" on %I', t);
    execute format('create policy "lf allow all" on %I for all using (true) with check (true)', t);
  end loop;
end $$;
grant select, insert, update, delete on lf_purchases, lf_stock_snapshots, lf_needs, lf_fertigation_lines to anon, authenticated;
