-- ============================================================
-- CLEANUP ORPHANED RECORDS
-- Run this in Supabase SQL Editor to fix previous failed registrations
-- ============================================================

-- 1. Delete students that have no branch (created by trigger but never updated)
DELETE FROM public.students 
WHERE branch_id IS NULL 
  AND user_id IN (
    SELECT id FROM public.users WHERE email LIKE '%@tkmaa.local'
  );

-- 2. Delete orphaned users created by failed registration attempts
DELETE FROM public.users 
WHERE email LIKE '%@tkmaa.local';

-- 3. Also clean up any students with users that no longer exist
DELETE FROM public.students 
WHERE user_id NOT IN (SELECT id FROM public.users);

-- 4. Clean up any trainers with users that no longer exist  
DELETE FROM public.trainers
WHERE user_id NOT IN (SELECT id FROM public.users);

-- 5. Show remaining students to verify
SELECT s.id, u.full_name, u.email, b.name as branch 
FROM students s 
JOIN users u ON s.user_id = u.id 
LEFT JOIN branches b ON s.branch_id = b.id
ORDER BY u.full_name;
