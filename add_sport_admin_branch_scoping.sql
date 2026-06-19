-- ============================================================================
-- TKMAA SPORTS ADMIN BRANCH-SCOPING MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. Update get_my_branch_ids() helper function
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


-- 2. Update RLS policies on branch_managers table to allow branch_admin management
DROP POLICY IF EXISTS "branch_managers_write" ON public.branch_managers;

CREATE POLICY "branch_managers_write" ON public.branch_managers FOR ALL
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() = 'branch_admin' AND public.is_in_my_branch(branch_id))
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() = 'branch_admin' AND public.is_in_my_branch(branch_id))
  );
