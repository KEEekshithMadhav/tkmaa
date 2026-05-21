-- MANUAL ROLE FIXER
-- Run this in your Supabase SQL Editor to fix any user's role

-- 1. FIX HARISH
UPDATE public.users 
SET role = 'trainer' 
WHERE email = 'harish@gmail.com';

-- 2. FIX KIRAN (Once the account is created)
UPDATE public.users 
SET role = 'trainer' 
WHERE email = 'kiran@gmail.com';

-- 3. ENSURE THEY ARE IN THE TRAINERS TABLE
-- You can run this if they are still not seeing their branch
INSERT INTO public.trainers (user_id, branch_id)
SELECT id, (SELECT id FROM public.branches WHERE name = 'Pragati Nagar' LIMIT 1)
FROM public.users WHERE email = 'harish@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET branch_id = EXCLUDED.branch_id;

INSERT INTO public.trainers (user_id, branch_id)
SELECT id, (SELECT id FROM public.branches WHERE name = 'Kukatpally' LIMIT 1)
FROM public.users WHERE email = 'kiran@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET branch_id = EXCLUDED.branch_id;
