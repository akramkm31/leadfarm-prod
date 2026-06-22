-- Add extended satellite indices to donnees_satellite
-- EVI  : Enhanced Vegetation Index        (less saturated than NDVI in dense canopy)
-- SAVI : Soil Adjusted Vegetation Index   (compensates bare soil reflectance)
-- NDRE : Red-Edge NDVI                    (chlorophyll, early stress detection)
-- min/max per index for spread analysis

ALTER TABLE donnees_satellite
  ADD COLUMN IF NOT EXISTS indice_evi   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS indice_savi  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS indice_ndre  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ndvi_min     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ndvi_max     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ndwi_min     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ndwi_max     DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS cloud_cover_pct DOUBLE PRECISION;
