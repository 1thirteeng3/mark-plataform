-- Migration: 1762300014_phase3_performance
-- Description: Performance Engineering (Set-Based Expiration + Partial Indexes)

-- 1. OPTIMIZED EXPIRATION PROCEDURE (Set-Based)
-- Replaces any iterative logic with single SQL statements.
DROP FUNCTION IF EXISTS expire_school_balances(uuid, date);

CREATE OR REPLACE FUNCTION expire_school_balances(
    p_school_id UUID,
    p_expiration_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as Owner (can write to ledger)
SET search_path = public
AS $$
DECLARE
    v_total_marks BIGINT;
    v_students_affected INTEGER;
    v_batch_id UUID;
BEGIN
    -- Generates a Batch ID for tracking this specific expiration event
    v_batch_id := gen_random_uuid();

    -- 1. Calculate stats (Snapshot before change)
    SELECT 
        COALESCE(SUM(marks_balance), 0),
        COUNT(*)
    INTO 
        v_total_marks,
        v_students_affected
    FROM students
    WHERE school_id = p_school_id 
    AND marks_balance > 0;

    -- If no marks to expire, return early
    IF v_students_affected = 0 THEN
        RETURN jsonb_build_object(
            'status', 'SUCCESS',
            'totalMarksExpired', 0,
            'studentsAffected', 0,
            'message', 'No balances to expire'
        );
    END IF;

    -- 2. Bulk Insert into Ledger (Audit Trail)
    -- We record the burn for every student in ONE query.
    INSERT INTO ledger_transactions (
        student_id, 
        type, 
        amount, 
        description, 
        created_at,
        metadata
    )
    SELECT 
        id, 
        'DEBIT', 
        marks_balance, 
        'Annual Expiration (Burn)', 
        NOW(),
        jsonb_build_object('batch_id', v_batch_id, 'date', p_expiration_date)
    FROM students
    WHERE school_id = p_school_id 
    AND marks_balance > 0;

    -- 3. Bulk Zero-Out Balances
    -- Update all students in ONE query.
    UPDATE students
    SET 
        marks_balance = 0, 
        updated_at = NOW()
    WHERE school_id = p_school_id 
    AND marks_balance > 0;

    -- 4. Return Stats
    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'totalMarksExpired', v_total_marks,
        'studentsAffected', v_students_affected,
        'batchId', v_batch_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'status', 'ERROR',
        'message', SQLERRM
    );
END;
$$;

-- 2. PARTIAL INDEXES (Speed up reads for Active Students)
-- Only indexes 5-10% of students who actually have marks, making getting the "Leaderboard" instant.
CREATE INDEX IF NOT EXISTS idx_active_students_balance 
ON students(school_id, marks_balance DESC) 
WHERE marks_balance > 0;

-- Index for finding students eligible for expiration (used by the Proc above)
CREATE INDEX IF NOT EXISTS idx_students_school_id 
ON students(school_id) 
WHERE marks_balance > 0;
