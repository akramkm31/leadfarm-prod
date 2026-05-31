-- Table to store high-resolution treatment paths (GPS trajectories)
CREATE TABLE IF NOT EXISTS public.treatment_trajectories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_id uuid NOT NULL REFERENCES public.treatments(id) ON DELETE CASCADE,
  points jsonb NOT NULL, -- Array of [lat, lng, speed, timestamp] pairs
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  total_distance float DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(treatment_id)
);

-- Index for fast lookup by treatment
CREATE INDEX IF NOT EXISTS idx_trajectories_treatment ON public.treatment_trajectories(treatment_id);

-- RLS Policies
ALTER TABLE public.treatment_trajectories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.treatment_trajectories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service_role insert/update" ON public.treatment_trajectories
  FOR ALL TO service_role USING (true);
