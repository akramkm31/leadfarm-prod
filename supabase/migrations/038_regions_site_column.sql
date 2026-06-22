-- regions.site (ADR-15) — safe if 016 was applied without site
ALTER TABLE regions ADD COLUMN IF NOT EXISTS site TEXT;
