-- Migration: 1762300010_phase2_rls
-- Description: Zero Trust Security (RLS Hardening)

-- 1. Revoke "Allow All" Policies (The "Wildcards")
-- We drop the policies created in the initial setup schema
DROP POLICY IF EXISTS "Allow edge function access" ON schools;
DROP POLICY IF EXISTS "Allow edge function access" ON users;
DROP POLICY IF EXISTS "Allow edge function access" ON students;
DROP POLICY IF EXISTS "Allow edge function access" ON school_rules;
DROP POLICY IF EXISTS "Allow edge function access" ON voucher_catalog;
DROP POLICY IF EXISTS "Allow edge function access" ON redeemed_vouchers;
DROP POLICY IF EXISTS "Allow edge function access" ON ledger_transactions;

-- 2. Enable RLS (Ensure it's on)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeemed_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;

-- 3. Define Granular Policies (The "Shield")

-- 3.1 SCHOOLS
-- Public read (needed for login/lookup)? Or restricted?
-- Let's allow public read for name lookup, but write is Service Role only.
CREATE POLICY "Public Read Schools" ON schools FOR SELECT USING (true);

-- 3.2 USERS
-- Users can see their own profile.
CREATE POLICY "Users View Self" ON users FOR SELECT USING (auth.uid() = id);
-- Admins can see users in their school.
CREATE POLICY "Admins View School Users" ON users FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users admin
        WHERE admin.id = auth.uid()
        AND admin.role = 'ADMIN'
        AND admin.school_id = users.school_id
    )
);

-- 3.3 STUDENTS
-- Student sees self.
CREATE POLICY "Student View Self" ON students FOR SELECT USING (user_id = auth.uid());
-- Admin sees students in their school.
CREATE POLICY "Admin View School Students" ON students FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users admin
        WHERE admin.id = auth.uid()
        AND admin.role = 'ADMIN'
        AND admin.school_id = students.school_id
    )
);

-- 3.4 SCHOOL RULES
-- Authenticated users can read rules of their school.
-- (Note: In Phase 1 we used ANON_KEY for fetchRules in tester, this RLS will BREAK that if we don't fix tester/token)
-- We'll allow public read for now to not break the demo, but restricted by School ID logically if we could.
-- Better: "Allow All Read" for rules is low risk compared to financial data.
CREATE POLICY "Public View Rules" ON school_rules FOR SELECT USING (true);
-- Write: Admins only.
CREATE POLICY "Admin Manage Rules" ON school_rules FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users admin
        WHERE admin.id = auth.uid()
        AND admin.role = 'ADMIN'
        AND admin.school_id = school_rules.school_id
    )
);

-- 3.5 VOUCHER CATALOG
-- Available to all authenticated users (or public read is fine for catalog).
CREATE POLICY "Public View Catalog" ON voucher_catalog FOR SELECT USING (true);

-- 3.6 REDEEMED VOUCHERS
-- Student sees own.
CREATE POLICY "Student View Redemptions" ON redeemed_vouchers FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = redeemed_vouchers.student_id
        AND s.user_id = auth.uid()
    )
);
-- Admin sees school redemptions.
CREATE POLICY "Admin View Redemptions" ON redeemed_vouchers FOR SELECT USING (
     EXISTS (
        SELECT 1 FROM users admin
        JOIN students s ON s.school_id = admin.school_id
        WHERE admin.id = auth.uid()
        AND admin.role = 'ADMIN'
        AND s.id = redeemed_vouchers.student_id
    )
);

-- 3.7 LEDGER TRANSACTIONS (Critical!)
-- Student sees own.
CREATE POLICY "Student View Ledger" ON ledger_transactions FOR SELECT USING (
    EXISTS (
         SELECT 1 FROM students s
         WHERE s.id = ledger_transactions.student_id
         AND s.user_id = auth.uid()
    )
);
-- Admin sees school ledger.
CREATE POLICY "Admin View Ledger" ON ledger_transactions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users admin
        JOIN students s ON s.school_id = admin.school_id
        WHERE admin.id = auth.uid()
        AND admin.role = 'ADMIN'
        AND s.id = ledger_transactions.student_id
    )
);

-- 4. Service Role Bypass
-- (Supabase Service Role key automatically bypasses RLS, but explicit GRANTs are good if we weren't using superuser)
-- We rely on the fact that Edge Functions using SERVICE_ROLE_KEY will work.
