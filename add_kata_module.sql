-- ============================================================================
-- TKMAA KATA TOURNAMENT MODULE SCHEMA
-- Phase 2 Execution
-- ============================================================================
-- Run this in your Supabase SQL Editor to support Kata forms scoring.

CREATE TABLE IF NOT EXISTS public.tournament_kata_performances (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  tournament_id   UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  round           INT NOT NULL DEFAULT 1,
  
  student_id      UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  kata_name       TEXT,
  
  -- Array of decimal scores from judges (e.g., [8.4, 8.5, 8.2, 8.8, 8.5])
  judge_scores    NUMERIC[] DEFAULT '{}',
  
  -- Calculated score (sum of middle scores, discarding highest and lowest)
  total_score     NUMERIC DEFAULT 0,
  
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  
  created_at      TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tournament_id, category, round, student_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tkp_tournament ON public.tournament_kata_performances(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tkp_cat ON public.tournament_kata_performances(tournament_id, category);
CREATE INDEX IF NOT EXISTS idx_tkp_student ON public.tournament_kata_performances(student_id);

-- Enable RLS
ALTER TABLE public.tournament_kata_performances ENABLE ROW LEVEL SECURITY;

-- Secure RLS Policies (Phase 1 standard)
DROP POLICY IF EXISTS "Allow authenticated read kata_performances" ON public.tournament_kata_performances;
CREATE POLICY "Allow authenticated read kata_performances" ON public.tournament_kata_performances 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin write kata_performances" ON public.tournament_kata_performances;
CREATE POLICY "Allow admin write kata_performances" ON public.tournament_kata_performances 
  FOR ALL TO authenticated 
  USING (public.get_my_role() IN ('super_admin', 'admin', 'sport_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'sport_admin'));

DROP POLICY IF EXISTS "Allow referee update kata_performances" ON public.tournament_kata_performances;
CREATE POLICY "Allow referee update kata_performances" ON public.tournament_kata_performances 
  FOR UPDATE TO authenticated 
  USING (public.get_my_role() IN ('super_admin', 'admin', 'sport_admin', 'trainer'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'sport_admin', 'trainer'));
