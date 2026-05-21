-- FIX DATABASE CONSTRAINTS
-- Run this in Supabase SQL Editor if you get "ON CONFLICT" errors

-- 1. Ensure public.users has 'id' as Primary Key
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='users' AND constraint_type='PRIMARY KEY'
    ) THEN
        ALTER TABLE public.users ADD PRIMARY KEY (id);
    END IF;
END $$;

-- 2. Ensure public.trainers has 'user_id' as Primary Key or Unique
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='trainers' AND constraint_type='PRIMARY KEY'
    ) THEN
        ALTER TABLE public.trainers ADD PRIMARY KEY (id);
    END IF;
END $$;

-- 3. Fix the constraint that's likely missing for UPSERT
-- Supabase needs a unique index to handle ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS users_id_idx ON public.users (id);
CREATE UNIQUE INDEX IF NOT EXISTS trainers_user_id_idx ON public.trainers (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS students_user_id_idx ON public.students (user_id);
