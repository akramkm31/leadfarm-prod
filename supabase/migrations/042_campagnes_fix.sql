-- ── 042_campagnes_fix.sql ────────────────────────────────────────────────────
-- Creates the campagnes table without FK to exploitations (which may not exist).
-- Follows the same exploitation_id UUID pattern as the treatments table.

CREATE TABLE IF NOT EXISTS public.campagnes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exploitation_id UUID        NOT NULL,
  nom             TEXT        NOT NULL,
  date_debut      DATE,
  date_fin        DATE,
  statut          TEXT        NOT NULL DEFAULT 'en_cours'
                              CHECK (statut IN ('planifie','en_cours','termine','suspendu')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campagnes_exploitation ON public.campagnes (exploitation_id);
CREATE INDEX IF NOT EXISTS idx_campagnes_statut       ON public.campagnes (statut);

-- updated_at trigger (same pattern as other tables)
CREATE OR REPLACE FUNCTION public.set_campagnes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_campagnes_updated_at ON public.campagnes;
CREATE TRIGGER trg_campagnes_updated_at
  BEFORE UPDATE ON public.campagnes
  FOR EACH ROW EXECUTE FUNCTION public.set_campagnes_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.campagnes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campagnes_select ON public.campagnes;
CREATE POLICY campagnes_select ON public.campagnes
  FOR SELECT USING (
    exploitation_id IS NULL
    OR exploitation_id IN (
      SELECT exploitation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS campagnes_insert ON public.campagnes;
CREATE POLICY campagnes_insert ON public.campagnes
  FOR INSERT WITH CHECK (
    exploitation_id IN (
      SELECT exploitation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS campagnes_update ON public.campagnes;
CREATE POLICY campagnes_update ON public.campagnes
  FOR UPDATE USING (
    exploitation_id IN (
      SELECT exploitation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS campagnes_delete ON public.campagnes;
CREATE POLICY campagnes_delete ON public.campagnes
  FOR DELETE USING (
    exploitation_id IN (
      SELECT exploitation_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- ── Seed demo data ────────────────────────────────────────────────────────────
INSERT INTO public.campagnes (id, exploitation_id, nom, date_debut, date_fin, statut)
VALUES
  (
    'c0000001-0000-4000-8000-000000000001',
    'a0000000-0000-4000-8000-000000000001',
    'Campagne 2024-2025',
    '2024-09-01',
    '2025-08-31',
    'en_cours'
  ),
  (
    'c0000001-0000-4000-8000-000000000002',
    'a0000000-0000-4000-8000-000000000001',
    'Campagne 2023-2024',
    '2023-09-01',
    '2024-08-31',
    'termine'
  ),
  (
    'c0000001-0000-4000-8000-000000000003',
    'a0000000-0000-4000-8000-000000000001',
    'Campagne 2025-2026',
    '2025-09-01',
    '2026-08-31',
    'planifie'
  )
ON CONFLICT (id) DO NOTHING;
