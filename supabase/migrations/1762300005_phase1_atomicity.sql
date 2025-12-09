-- Migration: 1762300005_phase1_atomicity
-- Description: Implement Atomic Financial Consistency (The Immutable Ledger)

-- 1.1. Store Procedure: grant_marks
-- Replaces the fallible application-side logic with a solid Database Transaction.
CREATE OR REPLACE FUNCTION grant_marks(
    p_student_id UUID,
    p_rule_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_user_id UUID -- The admin/user issuing the marks
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (su) to bypass RLS checks if needed, but we check logic internally
AS $$
DECLARE
    v_student_school_id UUID;
    v_rule_school_id UUID;
    v_admin_school_id UUID;
    v_rule_active BOOLEAN;
    v_new_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- 1. Validation Logic
    
    -- Get Student Info
    SELECT school_id INTO v_student_school_id
    FROM students
    WHERE id = p_student_id;

    IF v_student_school_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Student not found');
    END IF;

    -- Get Admin/User Info
    SELECT school_id INTO v_admin_school_id
    FROM users
    WHERE id = p_user_id AND role = 'ADMIN'; -- Enforce Admin Role check here

    IF v_admin_school_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Issuer not found or not an Admin');
    END IF;

    -- Check if Admin belongs to the same school as Student
    IF v_admin_school_id != v_student_school_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin belongs to a different school');
    END IF;

    -- Get Rule Info
    SELECT school_id, is_active INTO v_rule_school_id, v_rule_active
    FROM school_rules
    WHERE id = p_rule_id;

    IF v_rule_school_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rule not found');
    END IF;

    -- Check if Rule belongs to the same school
    IF v_rule_school_id != v_student_school_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Rule does not belong to the student/admin school');
    END IF;

    -- Check if Rule is active
    IF v_rule_active IS FALSE THEN
         RETURN jsonb_build_object('success', false, 'message', 'Rule is not active');
    END IF;

    -- 2. Execution (Implicit Transaction)
    
    -- Update Student Balance (Locking the row is good practice for concurrency, though UPDATE does it)
    UPDATE students
    SET marks_balance = marks_balance + p_amount,
        updated_at = NOW()
    WHERE id = p_student_id
    RETURNING marks_balance INTO v_new_balance;

    -- Insert into Ledger
    INSERT INTO ledger_transactions (
        student_id,
        type,
        amount,
        description,
        source_rule_id,
        created_at
    ) VALUES (
        p_student_id,
        'CREDIT',
        p_amount,
        p_description,
        p_rule_id,
        NOW()
    ) RETURNING id INTO v_transaction_id;

    -- Return Success
    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'transaction_id', v_transaction_id
    );

EXCEPTION WHEN OTHERS THEN
    -- In case of any DB error, rollback and return error
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 1.2. Immutable Ledger Trigger
-- Prevents any modification (Update/Delete) to the ledger_transactions table for audit safety.

CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger is immutable. Transactions cannot be updated or deleted. Issue a reversal transaction instead.';
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to allow idempotency
DROP TRIGGER IF EXISTS trg_prevent_ledger_mod ON ledger_transactions;

CREATE TRIGGER trg_prevent_ledger_mod
BEFORE UPDATE OR DELETE ON ledger_transactions
FOR EACH ROW
EXECUTE FUNCTION prevent_ledger_modification();
