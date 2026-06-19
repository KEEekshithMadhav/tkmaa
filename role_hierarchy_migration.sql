-- ============================================================================
-- TKMAA ROLE HIERARCHY MIGRATION
-- Adds helper functions for scope-aware RLS policies
-- Run this in Supabase SQL Editor BEFORE the secure_rls_policies.sql rewrite
-- ============================================================================

-- Enable UUID extension (safety)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. HELPER FUNCTION: get_my_role()
-- Returns the role of the currently authenticated user.
-- Uses SECURITY DEFINER to bypass RLS on public.users (prevents recursion).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
  -- Backward compat: treat 'admin' as 'super_admin'
  IF user_role = 'admin' THEN
    RETURN 'super_admin';
  END IF;
  RETURN COALESCE(user_role, 'student');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 2. HELPER FUNCTION: get_my_branch_ids()
-- Returns the branch IDs the current user can access.
-- super_admin → NULL (meaning all branches, handled in policy with IS NULL check)
-- branch_admin → branches from branch_managers
-- sport_admin → branches where their sport exists (via branch_sports)
-- trainer → their trainer.branch_id
-- student → their student.branch_id
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_branch_ids()
RETURNS UUID[] AS $$
DECLARE
  user_role text;
  result UUID[];
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
  
  -- Backward compat
  IF user_role = 'admin' THEN user_role := 'super_admin'; END IF;
  
  -- Super admin: return NULL (unrestricted)
  IF user_role = 'super_admin' THEN
    RETURN NULL;
  END IF;
  
  -- Branch admin: return assigned branches
  IF user_role = 'branch_admin' THEN
    SELECT ARRAY_AGG(branch_id) INTO result
    FROM public.branch_managers
    WHERE user_id = auth.uid();
    RETURN COALESCE(result, ARRAY[]::UUID[]);
  END IF;
  
  -- Sport admin: branches assigned in branch_managers, otherwise fallback to branches offering their assigned sports
  IF user_role = 'sport_admin' THEN
    SELECT ARRAY_AGG(branch_id) INTO result
    FROM public.branch_managers
    WHERE user_id = auth.uid();
    
    IF result IS NOT NULL AND ARRAY_LENGTH(result, 1) > 0 THEN
      RETURN result;
    END IF;

    SELECT ARRAY_AGG(DISTINCT bs.branch_id) INTO result
    FROM public.sport_admin_assignments sa
    JOIN public.branch_sports bs ON bs.sport_id = sa.sport_id
    WHERE sa.user_id = auth.uid();
    RETURN COALESCE(result, ARRAY[]::UUID[]);
  END IF;
  
  -- Trainer: their branch
  IF user_role = 'trainer' THEN
    SELECT ARRAY_AGG(branch_id) INTO result
    FROM public.trainers
    WHERE user_id = auth.uid();
    RETURN COALESCE(result, ARRAY[]::UUID[]);
  END IF;
  
  -- Student: their branch
  IF user_role = 'student' OR user_role = 'parent' THEN
    SELECT ARRAY_AGG(branch_id) INTO result
    FROM public.students
    WHERE user_id = auth.uid();
    RETURN COALESCE(result, ARRAY[]::UUID[]);
  END IF;
  
  RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 3. HELPER FUNCTION: get_my_sport_ids()
-- Returns the sport IDs the current user can access.
-- super_admin → NULL (all sports)
-- branch_admin → all sports in their branches
-- sport_admin → assigned sports
-- trainer → sports from trainer_sports
-- student → sports from student_sports
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_sport_ids()
RETURNS UUID[] AS $$
DECLARE
  user_role text;
  result UUID[];
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = auth.uid();
  
  IF user_role = 'admin' THEN user_role := 'super_admin'; END IF;
  
  -- Super admin: unrestricted
  IF user_role = 'super_admin' THEN
    RETURN NULL;
  END IF;
  
  -- Branch admin: all sports in their branches
  IF user_role = 'branch_admin' THEN
    SELECT ARRAY_AGG(DISTINCT bs.sport_id) INTO result
    FROM public.branch_managers bm
    JOIN public.branch_sports bs ON bs.branch_id = bm.branch_id
    WHERE bm.user_id = auth.uid();
    RETURN COALESCE(result, ARRAY[]::UUID[]);
  END IF;
  
  -- Sport admin: assigned sports
  IF user_role = 'sport_admin' THEN
    SELECT ARRAY_AGG(sport_id) INTO result
    FROM public.sport_admin_assignments
    WHERE user_id = auth.uid();
    RETURN COALESCE(result, ARRAY[]::UUID[]);
  END IF;
  
  -- Trainer: sports from trainer_sports
  IF user_role = 'trainer' THEN
    SELECT ARRAY_AGG(ts.sport_id) INTO result
    FROM public.trainers t
    JOIN public.trainer_sports ts ON ts.trainer_id = t.id
    WHERE t.user_id = auth.uid();
    RETURN COALESCE(result, ARRAY[]::UUID[]);
  END IF;
  
  -- Student: sports from student_sports
  IF user_role = 'student' OR user_role = 'parent' THEN
    SELECT ARRAY_AGG(ss.sport_id) INTO result
    FROM public.students s
    JOIN public.student_sports ss ON ss.student_id = s.id
    WHERE s.user_id = auth.uid();
    RETURN COALESCE(result, ARRAY[]::UUID[]);
  END IF;
  
  RETURN ARRAY[]::UUID[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 4. HELPER FUNCTION: is_in_my_branch(branch_id)
-- Quick check: does this branch_id fall within the user's scope?
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_in_my_branch(check_branch_id UUID)
RETURNS boolean AS $$
DECLARE
  my_branches UUID[];
BEGIN
  my_branches := public.get_my_branch_ids();
  -- NULL means super_admin (unrestricted)
  IF my_branches IS NULL THEN RETURN true; END IF;
  RETURN check_branch_id = ANY(my_branches);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 5. HELPER FUNCTION: is_in_my_sport(sport_id)
-- Quick check: does this sport_id fall within the user's scope?
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_in_my_sport(check_sport_id UUID)
RETURNS boolean AS $$
DECLARE
  my_sports UUID[];
BEGIN
  my_sports := public.get_my_sport_ids();
  IF my_sports IS NULL THEN RETURN true; END IF;
  -- NULL sport_id on a record means it applies to all sports
  IF check_sport_id IS NULL THEN RETURN true; END IF;
  RETURN check_sport_id = ANY(my_sports);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 6. Ensure role constraint allows all needed roles
-- ============================================================================
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'sport_admin', 'branch_admin', 'admin', 'trainer', 'student', 'parent'));
