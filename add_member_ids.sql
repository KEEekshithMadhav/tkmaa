-- ==========================================
-- ADD MEMBER IDs TO STUDENTS & TRAINERS
-- ==========================================

-- 1. Add columns
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS member_id VARCHAR(20) UNIQUE;
ALTER TABLE public.trainers ADD COLUMN IF NOT EXISTS member_id VARCHAR(20) UNIQUE;

-- 2. Create Sequences
CREATE SEQUENCE IF NOT EXISTS student_member_id_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS trainer_member_id_seq START WITH 1001;

-- 3. Create Functions to Generate IDs
CREATE OR REPLACE FUNCTION generate_student_member_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_id IS NULL THEN
    NEW.member_id := 'TKMAA-S-' || nextval('student_member_id_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_trainer_member_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_id IS NULL THEN
    NEW.member_id := 'TKMAA-T-' || nextval('trainer_member_id_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Triggers
DROP TRIGGER IF EXISTS trg_generate_student_member_id ON public.students;
CREATE TRIGGER trg_generate_student_member_id
BEFORE INSERT ON public.students
FOR EACH ROW
EXECUTE FUNCTION generate_student_member_id();

DROP TRIGGER IF EXISTS trg_generate_trainer_member_id ON public.trainers;
CREATE TRIGGER trg_generate_trainer_member_id
BEFORE INSERT ON public.trainers
FOR EACH ROW
EXECUTE FUNCTION generate_trainer_member_id();

-- 5. Update existing records
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.students WHERE member_id IS NULL LOOP
        UPDATE public.students SET member_id = 'TKMAA-S-' || nextval('student_member_id_seq') WHERE id = r.id;
    END LOOP;

    FOR r IN SELECT id FROM public.trainers WHERE member_id IS NULL LOOP
        UPDATE public.trainers SET member_id = 'TKMAA-T-' || nextval('trainer_member_id_seq') WHERE id = r.id;
    END LOOP;
END;
$$;
