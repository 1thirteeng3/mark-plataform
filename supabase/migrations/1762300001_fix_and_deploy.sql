-- COMPREHENSIVE FIX & DEPLOYMENT SCRIPT
-- Combines Schema Repair + V2 Tables + V1.1 Hardening

-- ========================================
-- PART 1: REPAIR EXISTING SCHEMA
-- ========================================

-- 1.1 Fix 'students' table columns
DO $$
BEGIN
    -- Rename institution_id to school_id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'institution_id') THEN
        ALTER TABLE students RENAME COLUMN institution_id TO school_id;
    END IF;

    -- Add marks_balance if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'marks_balance') THEN
        ALTER TABLE students ADD COLUMN marks_balance INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Add user_id if missing (nullable for now to avoid constraint errors on existing data)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'user_id') THEN
        ALTER TABLE students ADD COLUMN user_id UUID;
    END IF;
END $$;

-- ========================================
-- PART 2: ENSURE BASE TABLES EXIST (from V2 Schema)
-- ========================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create Types if not exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'STUDENT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('CREDIT', 'DEBIT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE redemption_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create Tables IF NOT EXISTS

CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    marks_to_award INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voucher_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    marks_cost INTEGER NOT NULL,
    provider_product_id VARCHAR(255) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS redeemed_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    voucher_catalog_id UUID NOT NULL,
    status redemption_status NOT NULL DEFAULT 'PENDING',
    voucher_code VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    type transaction_type NOT NULL,
    amount INTEGER NOT NULL,
    description TEXT NOT NULL,
    source_rule_id UUID,
    source_redemption_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PART 3: APPLY EVOLUTION V1.1 HARDENING
-- ========================================

-- 3.1 Schema Updates
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_id ON students(enrollment_id);

-- Migrate student_identifier to enrollment_id if applicable
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'student_identifier') THEN
        UPDATE students SET enrollment_id = student_identifier WHERE enrollment_id IS NULL;
    END IF;
END $$;

ALTER TABLE redeemed_vouchers ADD COLUMN IF NOT EXISTS cost INTEGER DEFAULT 0;

-- 3.2 Indexes
CREATE INDEX IF NOT EXISTS idx_ledger_student_date ON ledger_transactions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_type_created ON ledger_transactions(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redeemed_status_created ON redeemed_vouchers(status, created_at DESC);

-- 3.3 Stored Procedures & Views (Using CREATE OR REPLACE to be safe)

-- Stored Procedure: process_redemption
CREATE OR REPLACE FUNCTION process_redemption(
    p_student_id UUID,
    p_voucher_id UUID,
    p_cost INT
) RETURNS JSONB AS $$
DECLARE
    v_balance INT;
    v_redemption_id UUID;
    v_school_id UUID;
BEGIN
    SELECT marks_balance, school_id INTO v_balance, v_school_id 
    FROM students 
    WHERE id = p_student_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'ERROR', 'message', 'Aluno não encontrado');
    END IF;
    
    IF v_balance < p_cost THEN
        RETURN jsonb_build_object('status', 'ERROR', 'message', 'Saldo insuficiente', 'currentBalance', v_balance, 'requiredCost', p_cost);
    END IF;
    
    UPDATE students 
    SET marks_balance = marks_balance - p_cost, updated_at = NOW()
    WHERE id = p_student_id;
    
    INSERT INTO redeemed_vouchers (student_id, voucher_catalog_id, status, cost, created_at, updated_at)
    VALUES (p_student_id, p_voucher_id, 'PENDING', p_cost, NOW(), NOW())
    RETURNING id INTO v_redemption_id;
    
    INSERT INTO ledger_transactions (student_id, type, amount, description, source_redemption_id, created_at)
    VALUES (p_student_id, 'DEBIT', p_cost, 'Resgate de Voucher', v_redemption_id, NOW());
    
    RETURN jsonb_build_object('status', 'SUCCESS', 'redemptionId', v_redemption_id, 'newBalance', v_balance - p_cost, 'schoolId', v_school_id);
EXCEPTION 
    WHEN OTHERS THEN
        RETURN jsonb_build_object('status', 'ERROR', 'message', SQLERRM, 'errorDetail', SQLSTATE);
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure: expire_school_balances
CREATE OR REPLACE FUNCTION expire_school_balances(
    p_school_id UUID,
    p_expiration_date DATE DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_student RECORD;
    v_total_expired INT := 0;
    v_students_affected INT := 0;
    v_expiration_date DATE;
BEGIN
    v_expiration_date := COALESCE(p_expiration_date, CURRENT_DATE);
    
    FOR v_student IN 
        SELECT id, marks_balance, user_id
        FROM students
        WHERE school_id = p_school_id AND marks_balance > 0
        FOR UPDATE
    LOOP
        INSERT INTO ledger_transactions (student_id, type, amount, description, created_at)
        VALUES (v_student.id, 'DEBIT', v_student.marks_balance, 'Expiração Anual de Pontos - ' || v_expiration_date::TEXT, NOW());
        
        UPDATE students SET marks_balance = 0, updated_at = NOW() WHERE id = v_student.id;
        
        v_total_expired := v_total_expired + v_student.marks_balance;
        v_students_affected := v_students_affected + 1;
    END LOOP;
    
    RETURN jsonb_build_object('status', 'SUCCESS', 'schoolId', p_school_id, 'expirationDate', v_expiration_date, 'totalMarksExpired', v_total_expired, 'studentsAffected', v_students_affected, 'timestamp', NOW());
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('status', 'ERROR', 'message', SQLERRM, 'errorDetail', SQLSTATE);
END;
$$ LANGUAGE plpgsql;

-- Materialized View: analytics_school_engagement
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_school_engagement AS
SELECT 
    s.school_id,
    DATE_TRUNC('day', l.created_at) as ref_date,
    COUNT(DISTINCT l.student_id) as active_students,
    SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE 0 END) as total_minted,
    SUM(CASE WHEN l.type = 'DEBIT' AND l.source_redemption_id IS NOT NULL THEN l.amount ELSE 0 END) as total_redeemed,
    SUM(CASE WHEN l.type = 'DEBIT' AND l.source_redemption_id IS NULL THEN l.amount ELSE 0 END) as total_expired
FROM ledger_transactions l
JOIN students s ON l.student_id = s.id
WHERE l.created_at > NOW() - INTERVAL '90 days'
GROUP BY s.school_id, DATE_TRUNC('day', l.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_school_date ON analytics_school_engagement(school_id, ref_date);

CREATE OR REPLACE FUNCTION refresh_analytics() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_school_engagement;
END;
$$ LANGUAGE plpgsql;

-- View: school_financial_summary
CREATE OR REPLACE VIEW school_financial_summary AS
SELECT 
    sc.id as school_id,
    sc.name as school_name,
    COALESCE(SUM(st.marks_balance), 0) as total_circulating_marks,
    COUNT(st.id) as total_students,
    COUNT(st.id) FILTER (WHERE st.marks_balance > 0) as students_with_balance
FROM schools sc
LEFT JOIN students st ON sc.id = st.school_id
GROUP BY sc.id, sc.name;

-- View: top_students_by_school
CREATE OR REPLACE VIEW top_students_by_school AS
SELECT 
    s.school_id,
    st.id as student_id,
    u.name as student_name,
    st.marks_balance,
    COALESCE(SUM(CASE WHEN l.type = 'CREDIT' THEN l.amount ELSE 0 END), 0) as lifetime_earned,
    COALESCE(SUM(CASE WHEN l.type = 'DEBIT' THEN l.amount ELSE 0 END), 0) as lifetime_spent,
    ROW_NUMBER() OVER (PARTITION BY s.school_id ORDER BY st.marks_balance DESC) as rank
FROM students st
JOIN students s ON s.id = st.id
JOIN users u ON st.user_id = u.id
LEFT JOIN ledger_transactions l ON st.id = l.student_id
GROUP BY s.school_id, st.id, u.name, st.marks_balance;

-- View: top_rules_by_school
CREATE OR REPLACE VIEW top_rules_by_school AS
SELECT 
    sr.school_id,
    sr.id as rule_id,
    sr.rule_name,
    sr.marks_to_award,
    COUNT(l.id) as times_triggered,
    SUM(l.amount) as total_marks_awarded
FROM school_rules sr
LEFT JOIN ledger_transactions l ON sr.id = l.source_rule_id
WHERE l.type = 'CREDIT'
GROUP BY sr.school_id, sr.id, sr.rule_name, sr.marks_to_award
HAVING COUNT(l.id) > 0
ORDER BY sr.school_id, COUNT(l.id) DESC;

-- Verification
DO $$
BEGIN
    RAISE NOTICE 'Fix and Deployment completed successfully!';
END $$;
