-- ============================================================
-- REGISTER STUDENT & TRAINER FUNCTIONS
-- These run with SECURITY DEFINER (bypasses RLS)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── Register Student Function ──
CREATE OR REPLACE FUNCTION public.register_student(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_branch_id UUID,
  p_trainer_id UUID DEFAULT NULL,
  p_batch_id UUID DEFAULT NULL,
  p_belt_level_id UUID DEFAULT NULL,
  p_dob DATE DEFAULT NULL,
  p_gender TEXT DEFAULT 'male',
  p_parent_name TEXT DEFAULT NULL,
  p_parent_phone TEXT DEFAULT NULL,
  p_concession_type TEXT DEFAULT 'none',
  p_concession_reason TEXT DEFAULT NULL,
  p_fee NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_student_id UUID;
  v_email TEXT;
BEGIN
  -- Generate email if empty
  v_email := COALESCE(NULLIF(TRIM(p_email), ''), 
    LOWER(REPLACE(p_full_name, ' ', '.')) || '.' || EXTRACT(EPOCH FROM NOW())::BIGINT || '@tkmaa.local');

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'A user with email "%" already exists', v_email;
  END IF;

  -- 1. Create user
  v_user_id := gen_random_uuid();
  INSERT INTO public.users (id, clerk_id, email, full_name, phone, role)
  VALUES (v_user_id, v_user_id, v_email, p_full_name, p_phone, 'student');

  -- 2. Create student
  INSERT INTO public.students (user_id, branch_id, trainer_id, batch_id, belt_level_id, dob, gender, parent_name, parent_phone, join_date)
  VALUES (v_user_id, p_branch_id, p_trainer_id, p_batch_id, p_belt_level_id, p_dob, p_gender, p_parent_name, p_parent_phone, CURRENT_DATE)
  RETURNING id INTO v_student_id;

  -- 3. Create concession if applicable
  IF p_concession_type IS NOT NULL AND p_concession_type != 'none' THEN
    INSERT INTO public.concessions (student_id, concession_type, reason, discount_percent)
    VALUES (v_student_id, p_concession_type, p_concession_reason,
      CASE p_concession_type
        WHEN 'sibling' THEN 10
        WHEN 'financial' THEN 25
        WHEN 'merit' THEN 20
        ELSE 0
      END
    );
  END IF;

  -- 4. Create initial payment record
  IF p_fee > 0 THEN
    INSERT INTO public.payments (student_id, branch_id, amount, status, month, due_date)
    VALUES (v_student_id, p_branch_id, p_fee, 'pending', 
      TO_CHAR(CURRENT_DATE, 'YYYY-MM'), CURRENT_DATE + INTERVAL '15 days');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'student_id', v_student_id,
    'email', v_email
  );

EXCEPTION WHEN OTHERS THEN
  -- Cleanup on failure
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.students WHERE user_id = v_user_id;
    DELETE FROM public.users WHERE id = v_user_id;
  END IF;
  RAISE;
END;
$$;

-- ── Register Trainer Function ──
CREATE OR REPLACE FUNCTION public.register_trainer(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_branch_id UUID,
  p_experience_yrs INT DEFAULT 0,
  p_specialization TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_trainer_id UUID;
BEGIN
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'A user with email "%" already exists', p_email;
  END IF;

  -- 1. Create user
  v_user_id := gen_random_uuid();
  INSERT INTO public.users (id, clerk_id, email, full_name, phone, role)
  VALUES (v_user_id, v_user_id, p_email, p_full_name, p_phone, 'trainer');

  -- 2. Create trainer
  INSERT INTO public.trainers (user_id, branch_id, experience_yrs, specialization)
  VALUES (v_user_id, p_branch_id, p_experience_yrs, p_specialization)
  RETURNING id INTO v_trainer_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'trainer_id', v_trainer_id
  );

EXCEPTION WHEN OTHERS THEN
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.trainers WHERE user_id = v_user_id;
    DELETE FROM public.users WHERE id = v_user_id;
  END IF;
  RAISE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.register_student TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_trainer TO authenticated;
