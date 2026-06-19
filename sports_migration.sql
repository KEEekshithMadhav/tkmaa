-- ==========================================
-- TKMAA MULTI-SPORT MIGRATION
-- Phase 1: Sports Module + Role Hierarchy + Kumite Persistence + State Leaderboard
-- ==========================================
-- Run this in Supabase SQL Editor

-- Enable RLS by default
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SPORTS TABLE
CREATE TABLE IF NOT EXISTS public.sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT DEFAULT 'trophy',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BRANCH-SPORT MAPPING
CREATE TABLE IF NOT EXISTS public.branch_sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
    UNIQUE(branch_id, sport_id)
);

-- 3. TRAINER-SPORT MAPPING
CREATE TABLE IF NOT EXISTS public.trainer_sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
    UNIQUE(trainer_id, sport_id)
);

-- 4. STUDENT-SPORT MAPPING
CREATE TABLE IF NOT EXISTS public.student_sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
    UNIQUE(student_id, sport_id)
);

-- 5. EXPAND ROLE ENUM
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
    CHECK (role IN ('super_admin', 'sport_admin', 'branch_admin', 'admin', 'trainer', 'student', 'parent'));

-- 6. SPORT ADMIN ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.sport_admin_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
    UNIQUE(user_id, sport_id)
);

-- 7. CREATE BRANCH MANAGERS IF NOT EXISTS (dependency for branch management)
CREATE TABLE IF NOT EXISTS public.branch_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, branch_id)
);

-- ADD sport_id TO BRANCH MANAGERS (for branch_admin role)
ALTER TABLE public.branch_managers ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES public.sports(id);

-- 8. ADD sport_id TO BATCHES
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES public.sports(id);

-- 9. ADD sport_id, batch_id, trainer_id, remarks TO ATTENDANCE
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES public.sports(id);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES public.trainers(id);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Fix marked_by constraint to ensure it references users(id), not trainers(id)
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_marked_by_fkey;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 10. ADD sport_id TO TOURNAMENTS
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS sport_id UUID REFERENCES public.sports(id);
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS entry_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS tournament_type TEXT DEFAULT 'non_belt' CHECK (tournament_type IN ('belt_wise', 'non_belt'));
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_rules TEXT DEFAULT 'open' CHECK (registration_rules IN ('open', 'payment_required'));
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'open' CHECK (registration_status IN ('open', 'closed'));
ALTER TABLE public.tournament_participants ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';


-- 11. ADD extra student fields
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS alt_mobile TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Telangana';

-- 12. STUDENT BATCHES junction table (many-to-many)
CREATE TABLE IF NOT EXISTS public.student_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(student_id, batch_id)
);

-- 13. TOURNAMENT MATCHES (for kumite scoring)
CREATE TABLE IF NOT EXISTS public.tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    ao_id UUID REFERENCES public.students(id),
    aka_id UUID REFERENCES public.students(id),
    ao_score INTEGER DEFAULT 0,
    aka_score INTEGER DEFAULT 0,
    ao_penalties JSONB DEFAULT '{}',
    aka_penalties JSONB DEFAULT '{}',
    winner_id UUID REFERENCES public.students(id),
    senshu TEXT,
    match_duration INTEGER DEFAULT 120,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'completed')),
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add detailed Kumite scoring and warning columns to tournament_matches if not already present
ALTER TABLE public.tournament_matches 
ADD COLUMN IF NOT EXISTS ao_yuko_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ao_waza_ari_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ao_ippon_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ao_bonus_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS aka_yuko_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS aka_waza_ari_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS aka_ippon_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS aka_bonus_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ao_c1_penalties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ao_c2_penalties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS aka_c1_penalties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS aka_c2_penalties TEXT[] DEFAULT '{}';

-- ==========================================
-- SEED DEFAULT SPORTS
-- ==========================================
INSERT INTO public.sports (sport_name, description, icon) VALUES
    ('Karate', 'Traditional Shotokan Karate — the primary martial art of TKMAA', 'swords'),
    ('Music', 'Vocal and instrumental music training programs', 'music'),
    ('Dance', 'Classical and contemporary dance forms', 'drama'),
    ('Chess', 'Strategic board game training and competitive play', 'brain'),
    ('Yoga', 'Ancient practice for mind-body wellness and flexibility', 'heart'),
    ('Skating', 'Roller and ice skating programs for all levels', 'zap')
ON CONFLICT (sport_name) DO NOTHING;

-- ==========================================
-- MIGRATE EXISTING ADMIN USERS TO SUPER_ADMIN
-- ==========================================
UPDATE public.users SET role = 'super_admin' WHERE role = 'admin';

-- ==========================================
-- RLS POLICIES FOR NEW TABLES
-- ==========================================
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sport_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_managers ENABLE ROW LEVEL SECURITY;

-- Permissive policies for SELECT (public access where needed) and authenticated writes
DROP POLICY IF EXISTS "auth_read_sports" ON public.sports;
CREATE POLICY "auth_read_sports" ON public.sports FOR SELECT USING (true);
DROP POLICY IF EXISTS "auth_write_sports" ON public.sports;
CREATE POLICY "auth_write_sports" ON public.sports FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_branch_sports" ON public.branch_sports;
CREATE POLICY "auth_read_branch_sports" ON public.branch_sports FOR SELECT USING (true);
DROP POLICY IF EXISTS "auth_write_branch_sports" ON public.branch_sports;
CREATE POLICY "auth_write_branch_sports" ON public.branch_sports FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_trainer_sports" ON public.trainer_sports;
CREATE POLICY "auth_read_trainer_sports" ON public.trainer_sports FOR SELECT USING (true);
DROP POLICY IF EXISTS "auth_write_trainer_sports" ON public.trainer_sports;
CREATE POLICY "auth_write_trainer_sports" ON public.trainer_sports FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_student_sports" ON public.student_sports;
CREATE POLICY "auth_read_student_sports" ON public.student_sports FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_write_student_sports" ON public.student_sports;
CREATE POLICY "auth_write_student_sports" ON public.student_sports FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_sport_admin" ON public.sport_admin_assignments;
CREATE POLICY "auth_read_sport_admin" ON public.sport_admin_assignments FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_write_sport_admin" ON public.sport_admin_assignments;
CREATE POLICY "auth_write_sport_admin" ON public.sport_admin_assignments FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_student_batches" ON public.student_batches;
CREATE POLICY "auth_read_student_batches" ON public.student_batches FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_write_student_batches" ON public.student_batches;
CREATE POLICY "auth_write_student_batches" ON public.student_batches FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_tournament_matches" ON public.tournament_matches;
CREATE POLICY "auth_read_tournament_matches" ON public.tournament_matches FOR SELECT USING (true);
DROP POLICY IF EXISTS "auth_write_tournament_matches" ON public.tournament_matches;
CREATE POLICY "auth_write_tournament_matches" ON public.tournament_matches FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_read_branch_managers" ON public.branch_managers;
CREATE POLICY "auth_read_branch_managers" ON public.branch_managers FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "auth_write_branch_managers" ON public.branch_managers;
CREATE POLICY "auth_write_branch_managers" ON public.branch_managers FOR ALL USING (auth.role() = 'authenticated');

-- ==========================================
-- LINK EXISTING DATA TO KARATE SPORT
-- ==========================================
DO $$
DECLARE
    karate_id UUID;
BEGIN
    SELECT id INTO karate_id FROM public.sports WHERE sport_name = 'Karate';
    
    IF karate_id IS NOT NULL THEN
        -- Link all existing trainers to Karate
        INSERT INTO public.trainer_sports (trainer_id, sport_id)
        SELECT id, karate_id FROM public.trainers
        ON CONFLICT (trainer_id, sport_id) DO NOTHING;
        
        -- Link all existing students to Karate
        INSERT INTO public.student_sports (student_id, sport_id)
        SELECT id, karate_id FROM public.students
        ON CONFLICT (student_id, sport_id) DO NOTHING;
        
        -- Link all existing batches to Karate
        UPDATE public.batches SET sport_id = karate_id WHERE sport_id IS NULL;
        
        -- Link all branches to Karate
        INSERT INTO public.branch_sports (branch_id, sport_id)
        SELECT id, karate_id FROM public.branches
        ON CONFLICT (branch_id, sport_id) DO NOTHING;
        
        -- Link existing tournaments to Karate
        UPDATE public.tournaments SET sport_id = karate_id WHERE sport_id IS NULL;
    END IF;
END $$;
