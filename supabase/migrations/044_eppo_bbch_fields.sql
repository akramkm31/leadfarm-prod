-- 044: Add EPPO crop code, BBCH phenological stage, and product authorization number
-- Compliance with EU Reg. 2023/564 (machine-readable PPP records, mandatory from 2027)

ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS eppo_crop_code  TEXT,
  ADD COLUMN IF NOT EXISTS bbch_stage      TEXT;

ALTER TABLE treatment_detail_products
  ADD COLUMN IF NOT EXISTS product_auth_number TEXT;

COMMENT ON COLUMN treatments.eppo_crop_code          IS 'EPPO code for the crop (e.g. OLVEU for Olea europaea). Required by EU Reg. 2023/564.';
COMMENT ON COLUMN treatments.bbch_stage              IS 'BBCH phenological growth stage code at time of application (e.g. 60 = full bloom).';
COMMENT ON COLUMN treatment_detail_products.product_auth_number IS 'National PPP authorization/homologation number (AMM/INPV number).';
