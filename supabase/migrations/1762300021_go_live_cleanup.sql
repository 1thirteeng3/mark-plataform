-- GO LIVE CLEANUP SCRIPT 🚀
-- WARNING: THIS DELETES ALL DATA. RUN ONLY ONCE BEFORE LAUNCH.

BEGIN;

-- 0. Ensure Schema Consistency (Fix missing columns from Phase 2.2)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_salt TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;

-- 1. Wipe all data (Cascade deletes foreign key dependents)
TRUNCATE TABLE ledger_transactions, redeemed_vouchers, students, users, school_rules, voucher_catalog, schools, institutions RESTART IDENTITY CASCADE;

-- 2. Create Default Institution & School
INSERT INTO institutions (id, name, created_at) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Mark Educational Group', NOW());

INSERT INTO schools (id, name, created_at) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Mark Default School', NOW());

-- 3. Create Super Admin
-- Login: admin@mark.com / password123 (Change this immediately!)
INSERT INTO users (id, school_id, email, name, role, password_hash, password_salt, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000',
    'admin@mark.com',
    'Super Admin',
    'ADMIN',
    -- Default Hash for 'password123' (Legacy simple hash)
    'password123_hash', 
    NULL, -- Will trigger migration to PBKDF2 on first login
    NOW()
);

-- 4. Seed Basic Catalog (Optional)
INSERT INTO voucher_catalog (name, marks_cost, is_available, provider_product_id) VALUES
('iFood R$10', 200, true, '1'),
('Uber R$15', 300, true, '5'),
('Netflix 1-Month', 1000, true, '10');

COMMIT;
