-- Mark Platform v1.1 Migration Script

-- 1. Core Hardening: Stored Procedure for Redemption
\i src/vounchers/redeem/process_redemption.sql

-- 2. Latency Optimization: Indexes
\i database/indexes.sql

-- 3. Economic Governance: Expiration Logic (Placeholder for Cron)
-- Note: This file contains a PL/pgSQL block, can be run to verify syntax
\i src/governance/expiration/expire_marks.sql

-- 4. Student Management: Batch Import Tables (if any new tables needed)
-- Currently using existing 'students' table, but we might want to ensure columns exist.
-- Adding enrollment_id if not exists (idempotent check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='enrollment_id') THEN
        ALTER TABLE students ADD COLUMN enrollment_id VARCHAR(255);
        CREATE UNIQUE INDEX idx_students_enrollment_id ON students(enrollment_id);
    END IF;
END $$;
