-- ============================================================
-- FIX ROW-LEVEL SECURITY POLICIES
-- Run this in your Supabase SQL Editor to allow
-- authenticated users to INSERT/UPDATE/DELETE on all tables.
-- ============================================================

-- ── BATCHES ──
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read batches" ON public.batches;
DROP POLICY IF EXISTS "Allow authenticated insert batches" ON public.batches;
DROP POLICY IF EXISTS "Allow authenticated update batches" ON public.batches;
DROP POLICY IF EXISTS "Allow authenticated delete batches" ON public.batches;

CREATE POLICY "Allow authenticated read batches"   ON public.batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert batches" ON public.batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update batches" ON public.batches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete batches" ON public.batches FOR DELETE TO authenticated USING (true);

-- ── INVENTORY ──
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow authenticated insert inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow authenticated update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow authenticated delete inventory" ON public.inventory;

CREATE POLICY "Allow authenticated read inventory"   ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert inventory" ON public.inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update inventory" ON public.inventory FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete inventory" ON public.inventory FOR DELETE TO authenticated USING (true);

-- ── STUDENTS ──
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated insert students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated update students" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated delete students" ON public.students;

CREATE POLICY "Allow authenticated read students"   ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert students" ON public.students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update students" ON public.students FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete students" ON public.students FOR DELETE TO authenticated USING (true);

-- ── TRAINERS ──
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read trainers" ON public.trainers;
DROP POLICY IF EXISTS "Allow authenticated insert trainers" ON public.trainers;
DROP POLICY IF EXISTS "Allow authenticated update trainers" ON public.trainers;
DROP POLICY IF EXISTS "Allow authenticated delete trainers" ON public.trainers;

CREATE POLICY "Allow authenticated read trainers"   ON public.trainers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert trainers" ON public.trainers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update trainers" ON public.trainers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete trainers" ON public.trainers FOR DELETE TO authenticated USING (true);

-- ── USERS ──
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated insert users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated update users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated delete users" ON public.users;

CREATE POLICY "Allow authenticated read users"   ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert users" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update users" ON public.users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete users" ON public.users FOR DELETE TO authenticated USING (true);

-- ── TOURNAMENTS ──
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Allow authenticated insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Allow authenticated update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Allow authenticated delete tournaments" ON public.tournaments;

CREATE POLICY "Allow authenticated read tournaments"   ON public.tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert tournaments" ON public.tournaments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update tournaments" ON public.tournaments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete tournaments" ON public.tournaments FOR DELETE TO authenticated USING (true);

-- ── PAYMENTS ──
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated insert payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated update payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated delete payments" ON public.payments;

CREATE POLICY "Allow authenticated read payments"   ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update payments" ON public.payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete payments" ON public.payments FOR DELETE TO authenticated USING (true);

-- ── CONCESSIONS ──
ALTER TABLE public.concessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read concessions" ON public.concessions;
DROP POLICY IF EXISTS "Allow authenticated insert concessions" ON public.concessions;
DROP POLICY IF EXISTS "Allow authenticated update concessions" ON public.concessions;
DROP POLICY IF EXISTS "Allow authenticated delete concessions" ON public.concessions;

CREATE POLICY "Allow authenticated read concessions"   ON public.concessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert concessions" ON public.concessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update concessions" ON public.concessions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete concessions" ON public.concessions FOR DELETE TO authenticated USING (true);

-- ── CERTIFICATES ──
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read certificates" ON public.certificates;
DROP POLICY IF EXISTS "Allow authenticated insert certificates" ON public.certificates;
DROP POLICY IF EXISTS "Allow authenticated update certificates" ON public.certificates;
DROP POLICY IF EXISTS "Allow authenticated delete certificates" ON public.certificates;

CREATE POLICY "Allow authenticated read certificates"   ON public.certificates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert certificates" ON public.certificates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update certificates" ON public.certificates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete certificates" ON public.certificates FOR DELETE TO authenticated USING (true);

-- ── ATTENDANCE ──
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow authenticated insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow authenticated update attendance" ON public.attendance;
DROP POLICY IF EXISTS "Allow authenticated delete attendance" ON public.attendance;

CREATE POLICY "Allow authenticated read attendance"   ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update attendance" ON public.attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete attendance" ON public.attendance FOR DELETE TO authenticated USING (true);

-- ── NOTIFICATIONS ──
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated delete notifications" ON public.notifications;

CREATE POLICY "Allow authenticated read notifications"   ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update notifications" ON public.notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete notifications" ON public.notifications FOR DELETE TO authenticated USING (true);

-- ── RECEIPTS ──
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read receipts" ON public.receipts;
DROP POLICY IF EXISTS "Allow authenticated insert receipts" ON public.receipts;
DROP POLICY IF EXISTS "Allow authenticated update receipts" ON public.receipts;
DROP POLICY IF EXISTS "Allow authenticated delete receipts" ON public.receipts;

CREATE POLICY "Allow authenticated read receipts"   ON public.receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert receipts" ON public.receipts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update receipts" ON public.receipts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete receipts" ON public.receipts FOR DELETE TO authenticated USING (true);

-- ── FEE_STRUCTURE ──
ALTER TABLE public.fee_structure ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read fee_structure" ON public.fee_structure;
DROP POLICY IF EXISTS "Allow authenticated insert fee_structure" ON public.fee_structure;
DROP POLICY IF EXISTS "Allow authenticated update fee_structure" ON public.fee_structure;
DROP POLICY IF EXISTS "Allow authenticated delete fee_structure" ON public.fee_structure;

CREATE POLICY "Allow authenticated read fee_structure"   ON public.fee_structure FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert fee_structure" ON public.fee_structure FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update fee_structure" ON public.fee_structure FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete fee_structure" ON public.fee_structure FOR DELETE TO authenticated USING (true);

-- ── AUDIT_LOGS ──
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow authenticated insert audit_logs" ON public.audit_logs;

CREATE POLICY "Allow authenticated read audit_logs"   ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ── TOURNAMENT_PARTICIPANTS ──
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read tournament_participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Allow authenticated insert tournament_participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Allow authenticated update tournament_participants" ON public.tournament_participants;
DROP POLICY IF EXISTS "Allow authenticated delete tournament_participants" ON public.tournament_participants;

CREATE POLICY "Allow authenticated read tournament_participants"   ON public.tournament_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert tournament_participants" ON public.tournament_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update tournament_participants" ON public.tournament_participants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete tournament_participants" ON public.tournament_participants FOR DELETE TO authenticated USING (true);

-- ── QUICK_COLLECTIONS ──
ALTER TABLE public.quick_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read quick_collections" ON public.quick_collections;
DROP POLICY IF EXISTS "Allow authenticated insert quick_collections" ON public.quick_collections;
DROP POLICY IF EXISTS "Allow authenticated update quick_collections" ON public.quick_collections;
DROP POLICY IF EXISTS "Allow authenticated delete quick_collections" ON public.quick_collections;

CREATE POLICY "Allow authenticated read quick_collections"   ON public.quick_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert quick_collections" ON public.quick_collections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update quick_collections" ON public.quick_collections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete quick_collections" ON public.quick_collections FOR DELETE TO authenticated USING (true);

-- ── BRANCH_MANAGERS ──
ALTER TABLE public.branch_managers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read branch_managers" ON public.branch_managers;
DROP POLICY IF EXISTS "Allow authenticated insert branch_managers" ON public.branch_managers;
DROP POLICY IF EXISTS "Allow authenticated update branch_managers" ON public.branch_managers;
DROP POLICY IF EXISTS "Allow authenticated delete branch_managers" ON public.branch_managers;

CREATE POLICY "Allow authenticated read branch_managers"   ON public.branch_managers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert branch_managers" ON public.branch_managers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update branch_managers" ON public.branch_managers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete branch_managers" ON public.branch_managers FOR DELETE TO authenticated USING (true);

-- ── SPORT_ADMIN_ASSIGNMENTS ──
ALTER TABLE public.sport_admin_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read sport_admin_assignments" ON public.sport_admin_assignments;
DROP POLICY IF EXISTS "Allow authenticated insert sport_admin_assignments" ON public.sport_admin_assignments;
DROP POLICY IF EXISTS "Allow authenticated update sport_admin_assignments" ON public.sport_admin_assignments;
DROP POLICY IF EXISTS "Allow authenticated delete sport_admin_assignments" ON public.sport_admin_assignments;

CREATE POLICY "Allow authenticated read sport_admin_assignments"   ON public.sport_admin_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert sport_admin_assignments" ON public.sport_admin_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update sport_admin_assignments" ON public.sport_admin_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete sport_admin_assignments" ON public.sport_admin_assignments FOR DELETE TO authenticated USING (true);

-- ── SPORTS ──
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read sports" ON public.sports;
DROP POLICY IF EXISTS "Allow authenticated insert sports" ON public.sports;
DROP POLICY IF EXISTS "Allow authenticated update sports" ON public.sports;
DROP POLICY IF EXISTS "Allow authenticated delete sports" ON public.sports;
DROP POLICY IF EXISTS "sports_select" ON public.sports;
DROP POLICY IF EXISTS "sports_write" ON public.sports;

CREATE POLICY "sports_select" ON public.sports FOR SELECT TO authenticated USING (true);
CREATE POLICY "sports_write" ON public.sports FOR ALL TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));

-- ── BRANCH_SPORTS ──
ALTER TABLE public.branch_sports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read branch_sports" ON public.branch_sports;
DROP POLICY IF EXISTS "Allow authenticated insert branch_sports" ON public.branch_sports;
DROP POLICY IF EXISTS "Allow authenticated update branch_sports" ON public.branch_sports;
DROP POLICY IF EXISTS "Allow authenticated delete branch_sports" ON public.branch_sports;
DROP POLICY IF EXISTS "branch_sports_select" ON public.branch_sports;
DROP POLICY IF EXISTS "branch_sports_write" ON public.branch_sports;

CREATE POLICY "branch_sports_select" ON public.branch_sports FOR SELECT TO authenticated USING (true);
CREATE POLICY "branch_sports_write" ON public.branch_sports FOR ALL TO authenticated
  USING (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'))
  WITH CHECK (public.get_my_role() IN ('super_admin', 'admin', 'branch_admin'));
