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
