-- ════════════════════════════════════════════════════════════════════
-- Rattachement de toutes les données lf_ au tenant « Groupe Lechehab ».
-- ════════════════════════════════════════════════════════════════════

-- Tenant (détails complets) — réutilise l'exploitation des comptes démo.
insert into exploitations (id, nom, wilaya, commune, surface_ha, owner_id)
values (
  'a0000000-0000-4000-8000-000000000001',
  'Groupe Lechehab — Les Frères Lacheb',
  'Sidi Bel Abbès',
  'Tenira',
  (select round(sum(surface_ha)::numeric, 2) from lf_sectors),
  (select id from user_profiles where role = 'directeur' order by created_at limit 1)
)
on conflict (id) do update set
  nom = excluded.nom,
  wilaya = excluded.wilaya,
  commune = excluded.commune,
  surface_ha = excluded.surface_ha,
  owner_id = coalesce(excluded.owner_id, exploitations.owner_id);

-- Colonne tenant sur chaque table lf_ : NOT NULL + défaut Lechehab (backfill auto) + FK + index.
do $$
declare t text;
begin
  foreach t in array array[
    'lf_active_ingredients','lf_products','lf_suppliers','lf_sites','lf_stations',
    'lf_sectors','lf_movements','lf_purchases','lf_stock_snapshots','lf_needs','lf_fertigation_lines'
  ]
  loop
    execute format(
      'alter table %I add column if not exists exploitation_id uuid not null default ''a0000000-0000-4000-8000-000000000001'' references exploitations(id) on delete cascade',
      t);
    execute format('create index if not exists idx_%s_tenant on %I (exploitation_id)', t, t);
  end loop;
end $$;
