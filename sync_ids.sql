-- REWRITTEN SYNC SCRIPT
-- This script safely migrates IDs by matching emails.

DO $$
DECLARE
    user_row RECORD;
    auth_id UUID;
BEGIN
    -- 1. DROP CONSTRAINTS TEMPORARILY
    ALTER TABLE public.trainers DROP CONSTRAINT IF EXISTS trainers_user_id_fkey;
    ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_user_id_fkey;
    ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_student_id_fkey;

    -- 2. Iterate through your manually inserted users
    FOR user_row IN SELECT id, email FROM public.users LOOP
        -- Find if this user has a real Auth account
        SELECT id INTO auth_id FROM auth.users WHERE email = user_row.email;
        
        IF auth_id IS NOT NULL AND auth_id != user_row.id THEN
            RAISE NOTICE 'Syncing email %: % -> %', user_row.email, user_row.id, auth_id;
            
            -- Update child tables first
            UPDATE public.trainers SET user_id = auth_id WHERE user_id = user_row.id;
            UPDATE public.students SET user_id = auth_id WHERE user_id = user_row.id;
            UPDATE public.attendance SET student_id = auth_id WHERE student_id = user_row.id;
            UPDATE public.payments SET student_id = auth_id WHERE student_id = user_row.id;
            
            -- Update parent table
            UPDATE public.users SET id = auth_id WHERE id = user_row.id;
        END IF;
    END LOOP;

    -- 3. CLEAN UP ORPHANS (Delete records that don't have a matching user anymore)
    DELETE FROM public.trainers WHERE user_id NOT IN (SELECT id FROM public.users);
    DELETE FROM public.students WHERE user_id NOT IN (SELECT id FROM public.users);

    -- 4. RE-ADD CONSTRAINTS
    ALTER TABLE public.trainers ADD CONSTRAINT trainers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    ALTER TABLE public.students ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;

-- 5. ENSURE ROLES ARE CORRECT
UPDATE public.users SET role = 'trainer' WHERE email IN ('charan76@gmail.com', 'manoj@gmail.com', 'charan@gmail.com', 'bhanu@gmail.com', 'harish@gmail.com');
UPDATE public.users SET role = 'admin' WHERE email = 'madhav@gmail.com';
UPDATE public.users SET role = 'student' WHERE email = 'kiran4455@gmail.com';
