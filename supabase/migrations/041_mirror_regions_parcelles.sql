-- Mirror regions (canonical UI) into parcelles (MCD) for RLS on donnees_satellite

INSERT INTO parcelles (
  id,
  exploitation_id,
  code_parcelle,
  nom,
  surface_ha,
  centroide_lat,
  centroide_lng,
  geojson,
  culture_actuelle,
  variete,
  statut
)
SELECT
  r.id,
  'a0000000-0000-4000-8000-000000000001'::uuid,
  LEFT(REGEXP_REPLACE(COALESCE(r.name, r.id::text), '[^A-Za-z0-9_-]', '_', 'g'), 32),
  r.name,
  COALESCE(r.area_hectares, 0),
  CASE
    WHEN r.center IS NOT NULL AND jsonb_typeof(r.center) = 'array' AND jsonb_array_length(r.center) >= 2
    THEN (r.center->>0)::double precision
  END,
  CASE
    WHEN r.center IS NOT NULL AND jsonb_typeof(r.center) = 'array' AND jsonb_array_length(r.center) >= 2
    THEN (r.center->>1)::double precision
  END,
  CASE
    WHEN r.boundary IS NOT NULL AND jsonb_array_length(r.boundary) >= 3
    THEN jsonb_build_object('type', 'Polygon', 'coordinates', jsonb_build_array(r.boundary))
  END,
  r.crop_type,
  r.variete,
  'active'
FROM regions r
WHERE r.boundary IS NOT NULL AND jsonb_array_length(r.boundary) >= 3
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  surface_ha = EXCLUDED.surface_ha,
  centroide_lat = EXCLUDED.centroide_lat,
  centroide_lng = EXCLUDED.centroide_lng,
  geojson = EXCLUDED.geojson,
  culture_actuelle = EXCLUDED.culture_actuelle,
  variete = EXCLUDED.variete,
  statut = EXCLUDED.statut;
