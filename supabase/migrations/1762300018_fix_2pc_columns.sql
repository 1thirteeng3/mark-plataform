-- Fix 2PC Stored Procedures (Column Name Mismatch)
-- Updates logic to use 'voucher_catalog_id' instead of 'voucher_id'

-- 1. PREPARE Function (Fix Insert)
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

    -- Create Pending Redemption (FIXED COLUMN NAME)
    INSERT INTO redeemed_vouchers (student_id, voucher_catalog_id, status)
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


-- 2. ROLLBACK Function (Fix Select)
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
    -- Get Redemption Details (FIXED COLUMN NAME)
    SELECT student_id, voucher_catalog_id INTO v_student_id, v_voucher_id
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
