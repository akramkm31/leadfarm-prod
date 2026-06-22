-- ════════════════════════════════════════════════════════════════════
-- LeadFarm — Cœur métier aligné sur Groupe Lechehab (Les Frères Lacheb)
-- Lot 1 : référentiel produits (double-clé matière active ↔ produit),
-- unité Qx, ledger de mouvements à 5 flux, stock dérivé.
-- Stratégie "strangler" : préfixe lf_, coexiste avec le schéma legacy.
-- ════════════════════════════════════════════════════════════════════

-- ── Enums ───────────────────────────────────────────────────────────
do $$ begin
  create type lf_unit as enum ('kg', 'l', 'qx', 'unite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lf_product_category as enum
    ('FONGICIDE', 'HERBICIDE', 'INSECTICIDE', 'ENGRAIS', 'FER', 'ACIDE', 'DORMANCE', 'HORMONE', 'AUTRE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lf_movement_flow as enum
    ('stock_initial', 'transfert', 'entree', 'retour', 'sortie');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lf_culture as enum ('a_pepins', 'a_noyau', 'vigne');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lf_supplier_role as enum ('manufacturer', 'distributor');
exception when duplicate_object then null; end $$;

-- ── Matières actives (1ʳᵉ classe) ──────────────────────────────────
create table if not exists lf_active_ingredients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- ── Produits commerciaux ───────────────────────────────────────────
create table if not exists lf_products (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  category              lf_product_category not null default 'AUTRE',
  subcategory           text,                 -- axe nutriment/spécialité (N, P, K, Ca, AA, AH, ALGUES…)
  active_ingredient_id  uuid references lf_active_ingredients(id) on delete set null,
  active_ingredient_text text,                -- brut, si MA non normalisée
  composition           text,
  teneur_ma             text,
  formulation           text,
  famille_chimique      text,
  unit                  lf_unit not null default 'l',
  dar_days              integer,              -- délai avant récolte
  cible                 text,                 -- ravageur / maladie ciblé
  created_at            timestamptz not null default now(),
  unique (name, category)
);
create index if not exists idx_lf_products_ai on lf_products(active_ingredient_id);
create index if not exists idx_lf_products_cat on lf_products(category);

-- ── Fournisseurs (fabricant + distributeur) ────────────────────────
create table if not exists lf_suppliers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  role       lf_supplier_role not null default 'distributor',
  created_at timestamptz not null default now()
);

-- ── Géographie stock : Région → Zone → Site ────────────────────────
create table if not exists lf_sites (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  zone       text,
  region     text,
  culture    lf_culture,
  created_at timestamptz not null default now()
);

-- ── Fertigation : Station → Secteur (surface) ──────────────────────
create table if not exists lf_stations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists lf_sectors (
  id          uuid primary key default gen_random_uuid(),
  station_id  uuid not null references lf_stations(id) on delete cascade,
  code        text not null,            -- S1..S4
  surface_ha  numeric,
  unique (station_id, code)
);

-- ── Ledger de mouvements (le cœur) : 1 ligne = 1 flux ──────────────
create table if not exists lf_movements (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  product_id   uuid references lf_products(id) on delete set null,
  flow         lf_movement_flow not null,
  quantity     numeric not null default 0,   -- toujours >= 0 ; le signe découle du flux
  unit         lf_unit,
  culture      lf_culture,
  site_id      uuid references lf_sites(id) on delete set null,
  site_name    text,                          -- repli brut (lien best-effort)
  details_site text,
  dose         text,
  dar_days     integer,
  supplier_id  uuid references lf_suppliers(id) on delete set null,
  source_tag   text,                          -- M1 / M ENGRAIS / WhatsApp
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_lf_movements_product on lf_movements(product_id);
create index if not exists idx_lf_movements_date on lf_movements(date);
create index if not exists idx_lf_movements_flow on lf_movements(flow);

-- ── Stock dérivé (RESTE AUTO) ──────────────────────────────────────
create or replace view lf_stock_levels as
with mvt as (
  select product_id,
         sum(case flow
               when 'stock_initial' then quantity
               when 'entree'        then quantity
               when 'retour'        then quantity
               when 'sortie'        then -quantity
               when 'transfert'     then -quantity
             end) as reste
  from lf_movements
  where product_id is not null
  group by product_id
)
select p.id                       as product_id,
       p.name,
       p.category,
       p.subcategory,
       p.unit,
       ai.name                    as active_ingredient,
       coalesce(mvt.reste, 0)     as reste,
       coalesce(mvt.reste, 0) < 0 as is_negative
from lf_products p
left join lf_active_ingredients ai on ai.id = p.active_ingredient_id
left join mvt on mvt.product_id = p.id;

-- ── RLS (permissif comme le legacy ; à durcir plus tard) ───────────
do $$
declare t text;
begin
  foreach t in array array['lf_active_ingredients','lf_products','lf_suppliers','lf_sites','lf_stations','lf_sectors','lf_movements']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "lf allow all" on %I', t);
    execute format('create policy "lf allow all" on %I for all using (true) with check (true)', t);
  end loop;
end $$;

-- ── Grants (tables créées en SQL brut → pas d'auto-grant Supabase) ──
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  lf_active_ingredients, lf_products, lf_suppliers, lf_sites, lf_stations, lf_sectors, lf_movements
  to anon, authenticated;
grant select on lf_stock_levels to anon, authenticated;
