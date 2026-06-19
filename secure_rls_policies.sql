-- ============================================================================
-- TKMAA SECURE DATABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Phase 2: Branch-Scoped + Sport-Scoped Access Control
-- ============================================================================
-- PREREQUISITES: Run role_hierarchy_migration.sql first to create helper functions.
-- Run this in your Supabase SQL Editor.
--
-- Helper functions used:
--   get_my_role()       → returns current user's role
--   get_my_branch_ids() → returns UUID[] of branches (NULL = unrestricted)
--   get_my_sport_ids()  → returns UUID[] of sports (NULL = unrestricted)
--   is_in_my_branch(id) → boolean check
--   is_in_my_sport(id)  → boolean check

-- ============================================================================
-- 0. DROP ALL EXISTING POLICIES (clean slate)
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
  END LOOP;
END $$;


-- ── 1. USERS TABLE ──
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the users table (needed for name lookups)
CREATE POLICY "users_select" ON public.users FOR SELECT
  TO authenticated USING (true);

-- Anyone can insert (registration flow)
CREATE POLICY "users_insert" ON public.users FOR INSERT
  WITH CHECK (true);

-- Users can update their own record; admins can update any user in scope
CREATE POLICY "users_update" ON public.users FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() = 'branch_admin' AND public.is_in_my_branch(
      COALESCE(
        (SELECT branch_id FROM public.students WHERE user_id = users.id LIMIT 1),
        (SELECT branch_id FROM public.trainers WHERE user_id = users.id LIMIT 1)
      )
    ))
    OR (public.get_my_role() = 'sport_admin')
  )
  WITH CHECK (
    id = auth.uid()
    OR public.get_my_role() IN ('super_admin', 'admin')
    OR public.get_my_role() = 'branch_admin'
    OR public.get_my_role() = 'sport_admin'
  );

-- Only super_admin can delete users
CREATE POLICY "users_delete" ON public.users FOR DELETE
  TO authenticated USING (public.get_my_role() IN ('super_admin', 'admin'));


-- ── 2. BRANCHES TABLE ──
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- All authenticated can read branches (needed for dropdowns, but UI limits what's shown)
CREATE POLICY "branches_select" ON public.branches FOR SELECT
  TO authenticated USING (true);

-- Only super_admin can create/update/delete branches
CREATE POLICY "branches_insert" ON public.branches FOR INSERT
  TO authenticated WITH CHECK (public.get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "branches_update" ON public.branches FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() = 'branch_admin' AND public.is_in_my_branch(id))
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() = 'branch_admin' AND public.is_in_my_branch(id))
  );

CREATE POLICY "branches_delete" ON public.branches FOR DELETE
  TO authenticated USING (public.get_my_role() IN ('super_admin', 'admin'));


-- ── 3. BELT LEVELS TABLE ──
ALTER TABLE public.belt_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "belt_levels_select" ON public.belt_levels FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "belt_levels_write" ON public.belt_levels FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin'));


-- ── 4. SPORTS TABLE ──
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sports_select" ON public.sports FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "sports_write" ON public.sports FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));


-- ── 5. BRANCH_SPORTS TABLE ──
ALTER TABLE public.branch_sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branch_sports_select" ON public.branch_sports FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "branch_sports_write" ON public.branch_sports FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));


-- ── 6. STUDENT_SPORTS TABLE ──
ALTER TABLE public.student_sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_sports_select" ON public.student_sports FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "student_sports_write" ON public.student_sports FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin'));


-- ── 7. TRAINER_SPORTS TABLE ──
ALTER TABLE public.trainer_sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainer_sports_select" ON public.trainer_sports FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "trainer_sports_write" ON public.trainer_sports FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));


-- ── 8. TRAINERS TABLE ──
-- Branch-scoped: branch_admin can only see/manage trainers in their branch.
-- Sport-scoped: sport_admin sees trainers assigned to their sport.
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainers_select" ON public.trainers FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin')
    OR public.is_in_my_branch(branch_id)
  );

CREATE POLICY "trainers_insert" ON public.trainers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() = 'branch_admin' AND public.is_in_my_branch(branch_id))
  );

CREATE POLICY "trainers_update" ON public.trainers FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() = 'branch_admin' AND public.is_in_my_branch(branch_id))
    OR (public.get_my_role() = 'trainer' AND user_id = auth.uid())
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() = 'branch_admin' AND public.is_in_my_branch(branch_id))
    OR (public.get_my_role() = 'trainer' AND user_id = auth.uid())
  );

CREATE POLICY "trainers_delete" ON public.trainers FOR DELETE
  TO authenticated USING (public.get_my_role() IN ('super_admin', 'admin'));


-- ── 9. STUDENTS TABLE ──
-- Branch-scoped: branch_admin can only see students in their branch.
-- Sport_admin: can see students in their sport (enforced in app layer via student_sports).
-- Trainer: sees all students in their branch (batch filtering done in app layer).
-- Student: can see own record.
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_select" ON public.students FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin')
    OR public.is_in_my_branch(branch_id)
    OR user_id = auth.uid()
  );

CREATE POLICY "students_insert" ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() = 'branch_admin' AND public.is_in_my_branch(branch_id))
    OR public.get_my_role() = 'sport_admin'
  );

CREATE POLICY "students_update" ON public.students FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() IN ('branch_admin', 'sport_admin', 'trainer') AND public.is_in_my_branch(branch_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() IN ('branch_admin', 'sport_admin', 'trainer') AND public.is_in_my_branch(branch_id))
  );

CREATE POLICY "students_delete" ON public.students FOR DELETE
  TO authenticated USING (public.get_my_role() IN ('super_admin', 'admin'));


-- ── 10. BATCHES TABLE ──
-- Branch + Sport scoped.
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "batches_select" ON public.batches FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin')
    OR public.is_in_my_branch(branch_id)
  );

CREATE POLICY "batches_write" ON public.batches FOR ALL
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() IN ('branch_admin', 'sport_admin') AND public.is_in_my_branch(branch_id))
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() IN ('branch_admin', 'sport_admin') AND public.is_in_my_branch(branch_id))
  );


-- ── 11. STUDENT_BATCHES TABLE ──
ALTER TABLE public.student_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_batches_select" ON public.student_batches FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "student_batches_write" ON public.student_batches FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin', 'trainer'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin', 'trainer'));


-- ── 12. ATTENDANCE TABLE ──
-- Branch + sport scoped. Trainers can mark attendance for students in their branch.
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_select" ON public.attendance FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin', 'trainer')
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "attendance_write" ON public.attendance FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin', 'trainer'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin', 'trainer'));


-- ── 13. PAYMENTS TABLE ──
-- Only super_admin and branch_admin can manage fees. Sport_admin can view (fee tracking).
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select" ON public.payments FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin')
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "payments_write" ON public.payments FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));


-- ── 14. CONCESSIONS TABLE ──
ALTER TABLE public.concessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concessions_select" ON public.concessions FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin', 'branch_admin')
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "concessions_write" ON public.concessions FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));


-- ── 15. QUICK_COLLECTIONS TABLE ──
ALTER TABLE public.quick_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quick_collections_select" ON public.quick_collections FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin', 'branch_admin')
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "quick_collections_write" ON public.quick_collections FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));


-- ── 16. FEE_STRUCTURE TABLE ──
ALTER TABLE public.fee_structure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_structure_select" ON public.fee_structure FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "fee_structure_write" ON public.fee_structure FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));


-- ── 17. RECEIPTS TABLE ──
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receipts_select" ON public.receipts FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin', 'branch_admin')
    OR payment_id IN (
      SELECT id FROM public.payments WHERE student_id IN (
        SELECT id FROM public.students WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "receipts_write" ON public.receipts FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));


-- ── 18. CERTIFICATES TABLE ──
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificates_select" ON public.certificates FOR SELECT
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'trainer')
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "certificates_write" ON public.certificates FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));


-- ── 19. INVENTORY TABLE ──
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_select" ON public.inventory FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "inventory_write" ON public.inventory FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));


-- ── 20. TOURNAMENTS TABLE ──
-- Sport-scoped. sport_admin can manage their sport's tournaments.
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_select" ON public.tournaments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "tournaments_write" ON public.tournaments FOR ALL
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() IN ('branch_admin', 'sport_admin') AND public.is_in_my_sport(sport_id))
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'admin')
    OR (public.get_my_role() IN ('branch_admin', 'sport_admin') AND public.is_in_my_sport(sport_id))
  );


-- ── 21. TOURNAMENT_PARTICIPANTS TABLE ──
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_participants_select" ON public.tournament_participants FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "tournament_participants_insert" ON public.tournament_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin')
  );

CREATE POLICY "tournament_participants_update" ON public.tournament_participants FOR UPDATE
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin')
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin')
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "tournament_participants_delete" ON public.tournament_participants FOR DELETE
  TO authenticated
  USING (
    public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin')
    OR student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );


-- ── 22. TOURNAMENT_MATCHES TABLE ──
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_matches_select" ON public.tournament_matches FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "tournament_matches_write" ON public.tournament_matches FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin', 'sport_admin'));

-- Trainers can update match scores (referee role)
CREATE POLICY "tournament_matches_trainer_update" ON public.tournament_matches FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'trainer')
  WITH CHECK (public.get_my_role() = 'trainer');


-- ── 23. NOTIFICATIONS TABLE ──
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());


-- ── 24. AUDIT_LOGS TABLE ──
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT
  TO authenticated USING (public.get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);
-- Update and Delete are denied (no policies).


-- ── 25. SPORT_ADMIN_ASSIGNMENTS TABLE ──
ALTER TABLE public.sport_admin_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sport_admin_assignments_select" ON public.sport_admin_assignments FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "sport_admin_assignments_write" ON public.sport_admin_assignments FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));


-- ── 26. BRANCH_MANAGERS TABLE ──
ALTER TABLE public.branch_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branch_managers_select" ON public.branch_managers FOR SELECT
  TO authenticated USING (true);

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
