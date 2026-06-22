-- Allow authenticated users to manage regions (parcelles UI canonical table)
-- Complements existing anon policy; fixes silent DELETE failures under RLS.

DROP POLICY IF EXISTS regions_authenticated_all ON regions;
CREATE POLICY regions_authenticated_all ON regions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- FK cleanup: detach related rows instead of blocking parcelles delete
ALTER TABLE traitements DROP CONSTRAINT IF EXISTS traitements_parcelle_id_fkey;
ALTER TABLE traitements
  ADD CONSTRAINT traitements_parcelle_id_fkey
  FOREIGN KEY (parcelle_id) REFERENCES parcelles(id) ON DELETE SET NULL;

ALTER TABLE alertes DROP CONSTRAINT IF EXISTS alertes_parcelle_id_fkey;
ALTER TABLE alertes
  ADD CONSTRAINT alertes_parcelle_id_fkey
  FOREIGN KEY (parcelle_id) REFERENCES parcelles(id) ON DELETE SET NULL;
