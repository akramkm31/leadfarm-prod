-- RLS for treatment line items — inherit tenant scope from parent treatments (035)

DROP POLICY IF EXISTS "tdp_own_exploitation" ON treatment_detail_products;
DROP POLICY IF EXISTS tdp_allow_all ON treatment_detail_products;
DROP POLICY IF EXISTS "Allow all for anon" ON treatment_products;

CREATE OR REPLACE FUNCTION public.user_can_access_treatment(treatment_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM treatments t
    WHERE t.id = treatment_uuid
      AND (
        t.exploitation_id IS NULL
        OR t.exploitation_id IN (
          SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
        )
        OR t.parcelle_id IN (
          SELECT id FROM parcelles
          WHERE exploitation_id IN (
            SELECT exploitation_id FROM user_profiles WHERE id = auth.uid()
          )
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_treatment(UUID) TO authenticated;

CREATE POLICY tdp_authenticated_all ON treatment_detail_products
  FOR ALL TO authenticated
  USING (user_can_access_treatment(treatment_id))
  WITH CHECK (user_can_access_treatment(treatment_id));

CREATE POLICY tp_authenticated_all ON treatment_products
  FOR ALL TO authenticated
  USING (user_can_access_treatment(treatment_id))
  WITH CHECK (user_can_access_treatment(treatment_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON treatment_detail_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON treatment_products TO authenticated;
