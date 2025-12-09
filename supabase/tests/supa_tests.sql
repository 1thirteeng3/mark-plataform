-- Database Unit Tests (pgTAP)
-- Run this in the Supabase SQL Editor to verify logic integrity.

BEGIN;

-- 1. Setup Test Framework
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(8); -- Number of tests we plan to run

-- 2. Test Setup (Data Preparation)
-- Create a test school and institution (to satisfy legacy FKs)
INSERT INTO institutions (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Test Institution') ON CONFLICT DO NOTHING;
INSERT INTO schools (id, name, created_at) VALUES ('00000000-0000-0000-0000-000000000001', 'Test School', NOW()) ON CONFLICT DO NOTHING;
INSERT INTO users (id, school_id, email, role, name, password_hash, created_at) VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'test_admin@school.com', 'ADMIN', 'Test Admin', 'dummy_hash', NOW()) ON CONFLICT DO NOTHING;
INSERT INTO students (id, school_id, user_id, name, email, marks_balance, created_at) 
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Test Student', 'test_student@school.com', 0, NOW()) 
ON CONFLICT (id) DO UPDATE SET marks_balance = 0;

-- 3. Test: grant_marks (Positive)
SELECT lives_ok(
    $$ SELECT grant_marks('00000000-0000-0000-0000-000000000003', 100, 'Test Grant', '00000000-0000-0000-0000-000000000002') $$,
    'grant_marks should execute without error'
);

SELECT results_eq(
    $$ SELECT marks_balance FROM students WHERE id = '00000000-0000-0000-0000-000000000003' $$,
    ARRAY[100],
    'Student balance should be 100 after grant'
);

SELECT ok((SELECT count(*) FROM ledger_transactions WHERE student_id = '00000000-0000-0000-0000-000000000003') = 1, 'Should have 1 ledger entry');

-- 4. Test: expire_school_balances
SELECT lives_ok(
    $$ SELECT expire_school_balances('00000000-0000-0000-0000-000000000001', NOW()::date) $$,
    'expire_school_balances should run'
);

SELECT results_eq(
    $$ SELECT marks_balance FROM students WHERE id = '00000000-0000-0000-0000-000000000003' $$,
    ARRAY[0],
    'Student balance should be 0 after expiration'
);

-- 5. Test: prepare_redemption (2PC)
-- Give money back first
UPDATE students SET marks_balance = 500 WHERE id = '00000000-0000-0000-0000-000000000003';
-- Create a dummy voucher
INSERT INTO voucher_catalog (id, name, marks_cost, is_available, provider_product_id) VALUES ('00000000-0000-0000-0000-000000000009', 'Test Voucher', 200, true, 'test-product-123') ON CONFLICT DO NOTHING;

SELECT lives_ok(
    $$ SELECT prepare_redemption('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000009') $$,
    'prepare_redemption should succeed'
);

SELECT results_eq(
    $$ SELECT marks_balance FROM students WHERE id = '00000000-0000-0000-0000-000000000003' $$,
    ARRAY[300], -- 500 - 200
    'Balance should be deducted (Reserved)'
);

SELECT results_eq(
    $$ SELECT status::text FROM redeemed_vouchers WHERE student_id = '00000000-0000-0000-0000-000000000003' AND status = 'PENDING' $$,
    ARRAY['PENDING'],
    'Redemption should be PENDING'
);

-- 6. Finish
SELECT * FROM finish();
ROLLBACK;
