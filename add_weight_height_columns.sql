-- ================================================================
-- TKMAA Database Migration: Add Weight & Height Columns to Students
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/srdhlwserdycxhzvpeol/sql
-- ================================================================

-- 1. Add weight and height columns if they do not exist
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS weight NUMERIC;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS height NUMERIC;

-- 2. Add comments describing the columns
COMMENT ON COLUMN public.students.weight IS 'Weight of the student in kg';
COMMENT ON COLUMN public.students.height IS 'Height of the student in cm';

-- 3. Verify columns were added successfully
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'students' AND column_name IN ('weight', 'height');
