-- Suggested DDL for Stored Procedure
CREATE OR REPLACE FUNCTION process_redemption(
  p_student_id UUID,
  p_voucher_id UUID,
  p_cost INT
)
RETURNS JSONB AS $$
DECLARE
  v_balance INT;
  v_redemption_id UUID;
BEGIN
  -- 1. Lock on the student's line to avoid Race Condition (Double Spending)
  SELECT marks_balance INTO v_balance FROM students WHERE id = p_student_id
  FOR UPDATE;

  -- 2. Balance Validation
  IF v_balance < p_cost THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- 3. Start of Transaction
  -- Debit
  UPDATE students SET marks_balance = marks_balance - p_cost WHERE id = p_student_id;

  -- Register Voucher PENDING
  INSERT INTO redeemed_vouchers (student_id, voucher_catalog_id, status, cost)
  VALUES (p_student_id, p_voucher_id, 'PENDING', p_cost)
  RETURNING id INTO v_redemption_id;

  -- Register Ledger
  INSERT INTO ledger_transactions (student_id, type, amount, description, source_redemption_id)
  VALUES (p_student_id, 'DEBIT', p_cost, 'Voucher Redemption', v_redemption_id);

  -- Safe Return
  RETURN jsonb_build_object('status', 'SUCCESS', 'redemptionId', v_redemption_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('status', 'ERROR', 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
