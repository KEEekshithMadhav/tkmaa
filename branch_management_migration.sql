-- ============================================================
-- BRANCH MANAGEMENT MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add 'branch_manager' to users role constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('admin', 'trainer', 'student', 'parent', 'branch_manager'));

-- 2. Create branch_managers table to link managers to branches
CREATE TABLE IF NOT EXISTS public.branch_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, branch_id)
);

-- RLS for branch_managers
ALTER TABLE public.branch_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_branch_managers" ON public.branch_managers FOR ALL USING (true) WITH CHECK (true);

-- 3. Add branch insert/update/delete policies for branches table
DROP POLICY IF EXISTS "allow_all_branches" ON public.branches;
CREATE POLICY "allow_all_branches" ON public.branches FOR ALL USING (true) WITH CHECK (true);
