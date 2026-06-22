-- Tenant-scoped RLS for treatments (via parcelle → exploitation)
ALTER TABLE treatments ADD COLUMN IF NOT EXISTS exploitation_id UUID
  REFERENCES exploitations(id) ON DELETE SET NULL;

UPDATE treatments t
SET exploitation_id = p.exploitation_id
FROM parcelles p
WHERE t.parcelle_id = p.id
  AND t.exploitation_id IS NULL
  AND p.exploitation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_treatments_exploitation_id ON treatments(exploitation_id);

DROP POLICY IF EXISTS "Allow all for anon" ON treatments;

CREATE POLICY treatments_select_tenant ON treatments
  FOR SELECT USING (
    exploitation_id IS NULL
    OR exploitation_id IN (
      SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
    )
    OR parcelle_id IN (
      SELECT id FROM parcelles WHERE exploitation_id IN (
        SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY treatments_insert_tenant ON treatments
  FOR INSERT WITH CHECK (
    exploitation_id IS NULL
    OR exploitation_id IN (
      SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
    )
    OR parcelle_id IN (
      SELECT id FROM parcelles WHERE exploitation_id IN (
        SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY treatments_update_tenant ON treatments
  FOR UPDATE USING (
    exploitation_id IS NULL
    OR exploitation_id IN (
      SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
    )
    OR parcelle_id IN (
      SELECT id FROM parcelles WHERE exploitation_id IN (
        SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY treatments_delete_tenant ON treatments
  FOR DELETE USING (
    exploitation_id IN (
      SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
    )
  );
