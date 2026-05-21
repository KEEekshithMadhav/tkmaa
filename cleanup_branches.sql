-- CLEAN UP DUPLICATE BRANCHES
-- This script keeps the oldest entry for each branch name and migrates all links to it.

DO $$
DECLARE
    main_record RECORD;
    duplicate_record RECORD;
BEGIN
    -- Loop through each branch name that has more than one entry
    FOR main_record IN (
        SELECT name, (
            SELECT id FROM public.branches b2 
            WHERE b2.name = b1.name 
            ORDER BY created_at ASC LIMIT 1
        ) as primary_id
        FROM public.branches b1
        GROUP BY name
        HAVING COUNT(*) > 1
    ) LOOP
        RAISE NOTICE 'Cleaning up duplicates for branch: %', main_record.name;

        -- Find all OTHER IDs for this branch name
        FOR duplicate_record IN (
            SELECT id FROM public.branches 
            WHERE name = main_record.name AND id != main_record.primary_id
        ) LOOP
            -- 1. Migrate Trainers
            UPDATE public.trainers SET branch_id = main_record.primary_id WHERE branch_id = duplicate_record.id;
            
            -- 2. Migrate Students
            UPDATE public.students SET branch_id = main_record.primary_id WHERE branch_id = duplicate_record.id;
            
            -- 3. Delete the duplicate branch
            DELETE FROM public.branches WHERE id = duplicate_record.id;
        END LOOP;
    END LOOP;
END $$;
