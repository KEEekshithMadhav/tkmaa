-- ================================================================
-- TKMAA COMPLETE FIX MIGRATION
-- Run this ONCE in Supabase SQL Editor
-- Fixes all schema issues found in audit
-- ================================================================

-- ================================================================
-- STEP 1: EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- STEP 2: FIX users.role CHECK CONSTRAINT
-- (add super_admin, sport_admin, branch_admin)
-- ================================================================
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin','sport_admin','branch_admin','admin','trainer','student','parent'));

-- ================================================================
-- STEP 3: CREATE SPORTS TABLE (missing entirely)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.sports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sport_name  TEXT UNIQUE NOT NULL,
  icon        TEXT,
  description TEXT,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_sports" ON public.sports;
CREATE POLICY "allow_all_sports" ON public.sports FOR ALL USING (true) WITH CHECK (true);

-- Seed Karate (the sport your app uses)
INSERT INTO public.sports (sport_name, status)
VALUES ('Karate', 'active')
ON CONFLICT DO NOTHING;

-- ================================================================
-- STEP 4: CREATE STUDENT_SPORTS (missing entirely)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.student_sports (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  sport_id   UUID NOT NULL REFERENCES public.sports(id)   ON DELETE CASCADE,
  UNIQUE(student_id, sport_id)
);

ALTER TABLE public.student_sports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_student_sports" ON public.student_sports;
CREATE POLICY "allow_all_student_sports" ON public.student_sports FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_student_sports_student ON public.student_sports(student_id);
CREATE INDEX IF NOT EXISTS idx_student_sports_sport   ON public.student_sports(sport_id);

-- ================================================================
-- STEP 5: CREATE TRAINER_SPORTS (missing entirely)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.trainer_sports (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  sport_id   UUID NOT NULL REFERENCES public.sports(id)   ON DELETE CASCADE,
  UNIQUE(trainer_id, sport_id)
);

ALTER TABLE public.trainer_sports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_trainer_sports" ON public.trainer_sports;
CREATE POLICY "allow_all_trainer_sports" ON public.trainer_sports FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_trainer_sports_trainer ON public.trainer_sports(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_sports_sport   ON public.trainer_sports(sport_id);

-- ================================================================
-- STEP 6: CREATE BRANCH_SPORTS (missing entirely)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.branch_sports (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id  UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  sport_id   UUID NOT NULL REFERENCES public.sports(id)   ON DELETE CASCADE,
  UNIQUE(branch_id, sport_id)
);

ALTER TABLE public.branch_sports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_branch_sports" ON public.branch_sports;
CREATE POLICY "allow_all_branch_sports" ON public.branch_sports FOR ALL USING (true) WITH CHECK (true);

-- Seed: assign Karate to all existing branches
INSERT INTO public.branch_sports (branch_id, sport_id)
SELECT b.id, s.id
FROM public.branches b, public.sports s
WHERE s.sport_name = 'Karate'
ON CONFLICT DO NOTHING;

-- ================================================================
-- STEP 7: ADD sport_id TO batches (missing column)
-- ================================================================
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES public.sports(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_batches_sport ON public.batches(sport_id);

-- ================================================================
-- STEP 8: CREATE STUDENT_BATCHES junction table (missing entirely)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.student_batches (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id   UUID NOT NULL REFERENCES public.batches(id)  ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, batch_id)
);

ALTER TABLE public.student_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_student_batches" ON public.student_batches;
CREATE POLICY "allow_all_student_batches" ON public.student_batches FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_student_batches_student ON public.student_batches(student_id);
CREATE INDEX IF NOT EXISTS idx_student_batches_batch   ON public.student_batches(batch_id);

-- ================================================================
-- STEP 9: FIX attendance.marked_by FK (ROOT CAUSE of the FK error)
-- Original schema had: REFERENCES trainers(id)
-- Should be:          REFERENCES users(id)
-- ================================================================

-- 9a: Drop the old constraint (was pointing to trainers)
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_marked_by_fkey;

-- 9b: NULL out any existing marked_by values that are NOT in public.users
--     (they were stale trainer UUIDs from the old wrong FK)
UPDATE public.attendance
SET marked_by = NULL
WHERE marked_by IS NOT NULL
  AND marked_by NOT IN (SELECT id FROM public.users);

-- 9c: Now safely add the correct FK pointing to users
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_marked_by_fkey
  FOREIGN KEY (marked_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- ================================================================
-- STEP 10: ADD MISSING COLUMNS TO attendance
-- ================================================================
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS sport_id   UUID REFERENCES public.sports(id)   ON DELETE SET NULL;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS batch_id   UUID REFERENCES public.batches(id)  ON DELETE SET NULL;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES public.trainers(id) ON DELETE SET NULL;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS remarks    TEXT;

CREATE INDEX IF NOT EXISTS idx_attendance_sport   ON public.attendance(sport_id);
CREATE INDEX IF NOT EXISTS idx_attendance_batch   ON public.attendance(batch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_trainer ON public.attendance(trainer_id);

-- ================================================================
-- STEP 11: ADD MISSING COLUMNS TO tournaments
-- ================================================================
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS tournament_type    TEXT DEFAULT 'standard';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS custom_categories  TEXT[] DEFAULT '{}';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS sport_id           UUID REFERENCES public.sports(id) ON DELETE SET NULL;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registered_fee     NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS max_participants   INT;

CREATE INDEX IF NOT EXISTS idx_tournaments_sport ON public.tournaments(sport_id);

-- ================================================================
-- STEP 12: ADD MISSING COLUMNS TO tournament_participants
-- ================================================================
ALTER TABLE public.tournament_participants ADD COLUMN IF NOT EXISTS payment_status  TEXT DEFAULT 'pending' CHECK (payment_status IN ('paid','pending'));
ALTER TABLE public.tournament_participants ADD COLUMN IF NOT EXISTS weight_kg       NUMERIC;
ALTER TABLE public.tournament_participants ADD COLUMN IF NOT EXISTS height_cm       NUMERIC;
ALTER TABLE public.tournament_participants ADD COLUMN IF NOT EXISTS age_category    TEXT;
ALTER TABLE public.tournament_participants ADD COLUMN IF NOT EXISTS weight_category TEXT;
ALTER TABLE public.tournament_participants ADD COLUMN IF NOT EXISTS sport_id        UUID REFERENCES public.sports(id) ON DELETE SET NULL;

-- ================================================================
-- STEP 13: CREATE tournament_matches (missing entirely)
-- Used by: tournaments/page.js, kumite/page.js, leaderboard/page.js
-- ================================================================
CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  tournament_id   UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,

  round           INT NOT NULL DEFAULT 0,
  match_number    INT NOT NULL DEFAULT 0,

  -- Competitors
  ao_id           UUID REFERENCES public.students(id) ON DELETE SET NULL,
  aka_id          UUID REFERENCES public.students(id) ON DELETE SET NULL,
  winner_id       UUID REFERENCES public.students(id) ON DELETE SET NULL,

  -- Aggregate scores (computed from technique counts)
  ao_score        INT DEFAULT 0,
  aka_score       INT DEFAULT 0,

  -- Technique breakdown (kumite scoring)
  ao_yuko_count      INT DEFAULT 0,
  ao_waza_ari_count  INT DEFAULT 0,
  ao_ippon_count     INT DEFAULT 0,
  ao_bonus_points    INT DEFAULT 0,

  aka_yuko_count     INT DEFAULT 0,
  aka_waza_ari_count INT DEFAULT 0,
  aka_ippon_count    INT DEFAULT 0,
  aka_bonus_points   INT DEFAULT 0,

  -- Penalties (JSON objects: { is_bye: true } or {})
  ao_penalties    JSONB DEFAULT '{}',
  aka_penalties   JSONB DEFAULT '{}',

  -- Penalty category arrays: ["C1", "C2", "C3", "HC", "H"]
  ao_c1_penalties   TEXT[] DEFAULT '{}',
  ao_c2_penalties   TEXT[] DEFAULT '{}',
  aka_c1_penalties  TEXT[] DEFAULT '{}',
  aka_c2_penalties  TEXT[] DEFAULT '{}',

  -- Senshu (first-to-score advantage): 'ao' | 'aka' | null
  senshu          TEXT CHECK (senshu IN ('ao','aka')),

  status          TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed')),

  match_duration  INT DEFAULT 120,

  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tournament_id, category, round, match_number)
);

ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_tournament_matches" ON public.tournament_matches;
CREATE POLICY "allow_all_tournament_matches" ON public.tournament_matches
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tm_tournament    ON public.tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tm_cat           ON public.tournament_matches(tournament_id, category);
CREATE INDEX IF NOT EXISTS idx_tm_status        ON public.tournament_matches(status);

-- ================================================================
-- STEP 14: CREATE branch_managers (missing entirely)
-- Used by: supabase.js getBranchManagers(), assignBranchManager()
-- ================================================================
CREATE TABLE IF NOT EXISTS public.branch_managers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  branch_id  UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, branch_id)
);

ALTER TABLE public.branch_managers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_branch_managers" ON public.branch_managers;
CREATE POLICY "allow_all_branch_managers" ON public.branch_managers
  FOR ALL USING (true) WITH CHECK (true);

-- ================================================================
-- STEP 15: CREATE sport_admin_assignments (missing entirely)
-- Used by: supabase.js assignSportAdmin(), getSportAdmins()
-- ================================================================
CREATE TABLE IF NOT EXISTS public.sport_admin_assignments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  sport_id   UUID NOT NULL REFERENCES public.sports(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, sport_id)
);

ALTER TABLE public.sport_admin_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_sport_admin_assignments" ON public.sport_admin_assignments;
CREATE POLICY "allow_all_sport_admin_assignments" ON public.sport_admin_assignments
  FOR ALL USING (true) WITH CHECK (true);

-- ================================================================
-- STEP 16: SEED — assign Karate to all existing trainers
-- (so existing trainers show up in sport-filtered views)
-- ================================================================
INSERT INTO public.trainer_sports (trainer_id, sport_id)
SELECT t.id, s.id
FROM public.trainers t, public.sports s
WHERE s.sport_name = 'Karate'
ON CONFLICT DO NOTHING;

-- ================================================================
-- STEP 17: SEED — assign Karate to all existing students
-- ================================================================
INSERT INTO public.student_sports (student_id, sport_id)
SELECT s.id, sp.id
FROM public.students s, public.sports sp
WHERE sp.sport_name = 'Karate'
ON CONFLICT DO NOTHING;

-- ================================================================
-- STEP 18: UPDATE auto-trigger to also handle super_admin role
-- ================================================================
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'trainer' THEN
    INSERT INTO trainers (user_id, belt_level_id, is_active)
    VALUES (NEW.id, 9, true)
    ON CONFLICT (user_id) DO NOTHING;

  ELSIF NEW.role = 'student' THEN
    INSERT INTO students (user_id, belt_level_id, is_active)
    VALUES (NEW.id, 1, true)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_user_role_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'trainer' AND OLD.role <> 'trainer' THEN
    INSERT INTO trainers (user_id, belt_level_id, is_active)
    VALUES (NEW.id, 9, true)
    ON CONFLICT (user_id) DO NOTHING;

  ELSIF NEW.role = 'student' AND OLD.role <> 'student' THEN
    INSERT INTO students (user_id, belt_level_id, is_active)
    VALUES (NEW.id, 1, true)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- DONE — Verify with these checks:
-- ================================================================

-- Check all required tables exist:
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users','students','trainers','branches','belt_levels',
    'batches','attendance','payments','achievements','announcements',
    'sports','student_sports','trainer_sports','branch_sports',
    'student_batches','tournament_matches','tournaments',
    'tournament_participants','branch_managers','sport_admin_assignments'
  )
ORDER BY table_name;

-- Check attendance FK is now pointing to users:
SELECT
  tc.constraint_name,
  ccu.table_name AS foreign_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'attendance'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.constraint_name = 'attendance_marked_by_fkey';
-- Should show: foreign_table = 'users'

-- ================================================================
-- STEP 19: ALTER tournament_matches AND students TABLES TO ADD MISSING COLUMNS
-- (Handles cases where tables already existed but lacked the new columns)
-- ================================================================

-- tournament_matches missing columns
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS ao_yuko_count INT DEFAULT 0;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS ao_waza_ari_count INT DEFAULT 0;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS ao_ippon_count INT DEFAULT 0;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS ao_bonus_points INT DEFAULT 0;

ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS aka_yuko_count INT DEFAULT 0;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS aka_waza_ari_count INT DEFAULT 0;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS aka_ippon_count INT DEFAULT 0;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS aka_bonus_points INT DEFAULT 0;

ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS ao_c1_penalties TEXT[] DEFAULT '{}';
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS ao_c2_penalties TEXT[] DEFAULT '{}';
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS aka_c1_penalties TEXT[] DEFAULT '{}';
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS aka_c2_penalties TEXT[] DEFAULT '{}';

ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS ao_senshu BOOLEAN DEFAULT false;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS aka_senshu BOOLEAN DEFAULT false;

ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS ao_penalty_c1 BOOLEAN DEFAULT false;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS ao_penalty_c2 BOOLEAN DEFAULT false;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS ao_penalty_c3 BOOLEAN DEFAULT false;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS ao_penalty_hc BOOLEAN DEFAULT false;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS ao_penalty_h BOOLEAN DEFAULT false;

ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS aka_penalty_c1 BOOLEAN DEFAULT false;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS aka_penalty_c2 BOOLEAN DEFAULT false;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS aka_penalty_c3 BOOLEAN DEFAULT false;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS aka_penalty_hc BOOLEAN DEFAULT false;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS aka_penalty_h BOOLEAN DEFAULT false;

ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS extra_time_used INT DEFAULT 0;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS winner_corner TEXT;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS result_timestamp TIMESTAMPTZ;
ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS win_method TEXT;

-- students missing columns
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS photo_url TEXT;

