-- Migration: 1762300015_phase4_2pc
-- Description: Two-Phase Commit (2PC) for Resilient Voucher Redemption

-- 1. ENHANCE TABLE to support State Machine
-- We add a status column to track the lifecycle of a redemption.
ALTER TABLE redeemed_vouchers 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'FAILED')),
ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + interval '5 minutes'),
ADD COLUMN IF NOT EXISTS external_reference_id TEXT,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- 2. PREPARE Function (Step 1: Reserve)
-- Deducts balance immediately but keeps transaction in PENDING state.
CREATE OR REPLACE FUNCTION prepare_redemption(
    p_student_id UUID,
    p_voucher_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cost INTEGER;
    v_balance INTEGER;
    v_redemption_id UUID;
    v_voucher_name TEXT;
BEGIN
    -- Get Voucher Cost
    SELECT marks_cost, name INTO v_cost, v_voucher_name
    FROM voucher_catalog 
    WHERE id = p_voucher_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'ERROR', 'message', 'Voucher not found');
    END IF;

    -- Check Balance (Locking row)
    SELECT marks_balance INTO v_balance
    FROM students
    WHERE id = p_student_id
    FOR UPDATE;

    IF v_balance < v_cost THEN
        RETURN jsonb_build_object('status', 'ERROR', 'message', 'Insufficient balance');
    END IF;

    -- Create Pending Redemption
    INSERT INTO redeemed_vouchers (student_id, voucher_id, status)
    VALUES (p_student_id, p_voucher_id, 'PENDING')
    RETURNING id INTO v_redemption_id;

    -- Deduct Balance (Reservation)
    UPDATE students 
    SET marks_balance = marks_balance - v_cost 
    WHERE id = p_student_id;

    -- Record Ledger (Reservation)
    INSERT INTO ledger_transactions (student_id, type, amount, description, created_at, metadata)
    VALUES (
        p_student_id, 
        'DEBIT', 
        v_cost, 
        'Voucher Reservation: ' || v_voucher_name, 
        NOW(),
        jsonb_build_object('redemption_id', v_redemption_id, 'phase', 'PREPARE')
    );

    RETURN jsonb_build_object(
        'status', 'SUCCESS', 
        'redemption_id', v_redemption_id,
        'cost', v_cost
    );
END;
$$;

-- 3. CONFIRM Function (Step 2: Commit)
-- Finalizes the transaction after external system success.
CREATE OR REPLACE FUNCTION confirm_redemption(
    p_redemption_id UUID,
    p_external_ref TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE redeemed_vouchers
    SET 
        status = 'CONFIRMED',
        external_reference_id = p_external_ref,
        redeemed_at = NOW() -- Finalize time
    WHERE id = p_redemption_id AND status = 'PENDING';

    IF NOT FOUND THEN
         RETURN jsonb_build_object('status', 'ERROR', 'message', 'Redemption not found or not pending');
    END IF;

    RETURN jsonb_build_object('status', 'SUCCESS');
END;
$$;

-- 4. ROLLBACK Function (Step 2: Abort)
-- Reverses the transaction if external system fails.
CREATE OR REPLACE FUNCTION rollback_redemption(
    p_redemption_id UUID,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_voucher_id UUID;
    v_cost INTEGER;
BEGIN
    -- Get Redemption Details
    SELECT student_id, voucher_id INTO v_student_id, v_voucher_id
    FROM redeemed_vouchers
    WHERE id = p_redemption_id AND status = 'PENDING';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'ERROR', 'message', 'Redemption not found or not pending');
    END IF;

    -- Get Cost to Refund
    SELECT marks_cost INTO v_cost
    FROM voucher_catalog
    WHERE id = v_voucher_id;

    -- Update Redemption Status
    UPDATE redeemed_vouchers
    SET 
        status = 'FAILED',
        failure_reason = p_reason
    WHERE id = p_redemption_id;

    -- Refund Balance
    UPDATE students
    SET marks_balance = marks_balance + v_cost
    WHERE id = v_student_id;

    -- Record Ledger (Refund)
    INSERT INTO ledger_transactions (student_id, type, amount, description, created_at, metadata)
    VALUES (
        v_student_id, 
        'CREDIT', 
        v_cost, 
        'Refund: ' || p_reason, 
        NOW(),
        jsonb_build_object('redemption_id', p_redemption_id, 'phase', 'ROLLBACK')
    );

    RETURN jsonb_build_object('status', 'SUCCESS', 'refunded_amount', v_cost);
END;
$$;
