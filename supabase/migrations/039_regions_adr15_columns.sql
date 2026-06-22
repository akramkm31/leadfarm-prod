-- ADR-15 columns that may be missing on older production DBs
ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES regions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS area_hectares NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS crop_type TEXT,
  ADD COLUMN IF NOT EXISTS variete TEXT,
  ADD COLUMN IF NOT EXISTS culture_type TEXT DEFAULT 'arboriculture',
  ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS center JSONB,
  ADD COLUMN IF NOT EXISTS boundary JSONB,
  ADD COLUMN IF NOT EXISTS site TEXT;

CREATE INDEX IF NOT EXISTS idx_regions_parent ON regions(parent_id);
