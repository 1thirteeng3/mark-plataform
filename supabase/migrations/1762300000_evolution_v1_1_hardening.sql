-- Migration: Mark Platform Evolution v1.1 - Core Hardening & Schema Updates
-- Created at: 1762300000
-- Description: Security hardening, transaction atomicity, and schema improvements

-- ========================================
-- MODULE 0: CORE HARDENING
-- ========================================

-- 0.1 Schema Updates for Module 1 (Student Management)
-- Add enrollment_id field to students table for school ERP integration
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_id ON students(enrollment_id);

-- Add cost column to redeemed_vouchers if not exists (for stored procedure)
ALTER TABLE redeemed_vouchers ADD COLUMN IF NOT EXISTS cost INTEGER DEFAULT 0;

-- 0.2 Performance Optimization - Composite Indexes
-- Critical index for ledger queries (used in dashboards and analytics)
CREATE INDEX IF NOT EXISTS idx_ledger_student_date ON ledger_transactions(student_id, created_at DESC);

-- Index for school-based ledger queries
CREATE INDEX IF NOT EXISTS idx_ledger_type_created ON ledger_transactions(type, created_at DESC);

-- Index for redemption tracking
CREATE INDEX IF NOT EXISTS idx_redeemed_status_created ON redeemed_vouchers(status, created_at DESC);

-- ========================================
-- 0.3 Transaction Atomicity - Stored Procedures
-- ========================================

-- Stored Procedure: process_redemption
-- Purpose: Ensure atomic voucher redemption with race condition protection
-- This replaces the previous multi-step workflow approach
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
    -- 1. Lock the student row to prevent Race Condition (Double Spending)
    SELECT marks_balance, school_id INTO v_balance, v_school_id 
    FROM students 
    WHERE id = p_student_id 
    FOR UPDATE;

    -- Check if student exists
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'status', 'ERROR',
            'message', 'Aluno não encontrado'
        );
    END IF;
    
    -- 2. Balance Validation
    IF v_balance < p_cost THEN
        RETURN jsonb_build_object(
            'status', 'ERROR',
            'message', 'Saldo insuficiente',
            'currentBalance', v_balance,
            'requiredCost', p_cost
        );
    END IF;
    
    -- 3. Debit the student account
    UPDATE students 
    SET marks_balance = marks_balance - p_cost,
        updated_at = NOW()
    WHERE id = p_student_id;
    
    -- 4. Register voucher redemption as PENDING
    INSERT INTO redeemed_vouchers (student_id, voucher_catalog_id, status, cost, created_at, updated_at)
    VALUES (p_student_id, p_voucher_id, 'PENDING', p_cost, NOW(), NOW())
    RETURNING id INTO v_redemption_id;
    
    -- 5. Register transaction in ledger
    INSERT INTO ledger_transactions (student_id, type, amount, description, source_redemption_id, created_at)
    VALUES (p_student_id, 'DEBIT', p_cost, 'Resgate de Voucher', v_redemption_id, NOW());
    
    -- 6. Return success with redemption details
    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'redemptionId', v_redemption_id,
        'newBalance', v_balance - p_cost,
        'schoolId', v_school_id
    );
    
EXCEPTION 
    WHEN OTHERS THEN
        -- Rollback is automatic in PostgreSQL functions
        RETURN jsonb_build_object(
            'status', 'ERROR',
            'message', SQLERRM,
            'errorDetail', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MODULE 2: ECONOMIC GOVERNANCE
-- ========================================

-- Stored Procedure: expire_school_balances
-- Purpose: Implement annual mark expiration policy (Dec 31st)
-- This prevents inflation and maintains economic health
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
    -- Use provided date or default to current date
    v_expiration_date := COALESCE(p_expiration_date, CURRENT_DATE);
    
    -- Iterate over all students in the school with positive balance
    FOR v_student IN 
        SELECT id, marks_balance, user_id
        FROM students
        WHERE school_id = p_school_id AND marks_balance > 0
        FOR UPDATE
    LOOP
        -- Record expiration transaction in ledger
        INSERT INTO ledger_transactions (
            student_id, 
            type, 
            amount, 
            description, 
            created_at
        )
        VALUES (
            v_student.id,
            'DEBIT',
            v_student.marks_balance,
            'Expiração Anual de Pontos - ' || v_expiration_date::TEXT,
            NOW()
        );
        
        -- Zero out the balance
        UPDATE students
        SET marks_balance = 0,
            updated_at = NOW()
        WHERE id = v_student.id;
        
        -- Track totals
        v_total_expired := v_total_expired + v_student.marks_balance;
        v_students_affected := v_students_affected + 1;
    END LOOP;
    
    -- Return deflation report
    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'schoolId', p_school_id,
        'expirationDate', v_expiration_date,
        'totalMarksExpired', v_total_expired,
        'studentsAffected', v_students_affected,
        'timestamp', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'status', 'ERROR',
            'message', SQLERRM,
            'errorDetail', SQLSTATE
        );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MODULE 3: DATA INTELLIGENCE
-- ========================================

-- Materialized View: School Engagement Analytics
-- Purpose: Pre-computed analytics for fast dashboard rendering
-- Refresh: Daily via cron job or on-demand
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

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_school_date ON analytics_school_engagement(school_id, ref_date);

-- Function to refresh analytics (called by cron)
CREATE OR REPLACE FUNCTION refresh_analytics() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_school_engagement;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ADDITIONAL VIEWS FOR ANALYTICS
-- ========================================

-- View: Current school liabilities (circulating marks)
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

-- View: Top performing students by school
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

-- View: Most triggered rules by school
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

-- ========================================
-- MIGRATION VALIDATION
-- ========================================

-- Verify critical components exist
DO $$
BEGIN
    -- Check stored procedures
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_redemption') THEN
        RAISE EXCEPTION 'Failed to create process_redemption function';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'expire_school_balances') THEN
        RAISE EXCEPTION 'Failed to create expire_school_balances function';
    END IF;
    
    -- Check materialized view
    IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'analytics_school_engagement') THEN
        RAISE EXCEPTION 'Failed to create analytics_school_engagement materialized view';
    END IF;
    
    RAISE NOTICE 'Mark Platform Evolution v1.1 - Migration completed successfully!';
END $$;
