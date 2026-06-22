-- Checklist stockage: observations + RLS insert/select fix
ALTER TABLE checklist_stockage
  ADD COLUMN IF NOT EXISTS observations TEXT;

DROP POLICY IF EXISTS "own_exploitation_checklist_stockage" ON checklist_stockage;

CREATE POLICY "checklist_stockage_select" ON checklist_stockage
  FOR SELECT USING (
    verificateur_id = auth.uid()
    OR exploitation_id IN (
      SELECT exploitation_id FROM user_profiles WHERE id = auth.uid() AND exploitation_id IS NOT NULL
    )
  );

CREATE POLICY "checklist_stockage_insert" ON checklist_stockage
  FOR INSERT WITH CHECK (
    verificateur_id = auth.uid()
    OR exploitation_id IN (
      SELECT exploitation_id FROM user_profiles WHERE id = auth.uid() AND exploitation_id IS NOT NULL
    )
  );

GRANT SELECT, INSERT ON checklist_stockage TO authenticated, anon;
