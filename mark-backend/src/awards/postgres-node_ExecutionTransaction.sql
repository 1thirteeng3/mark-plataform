BEGIN;
  UPDATE students
    SET marks_balance = marks_balance + $1
  WHERE id = $2;

  INSERT INTO ledger_transactions (
    id,
    student_id,
    type,
    amount,
    description,
    source_rule_id,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    $2,
    'CREDIT',
    $1,
    $3,
    $4,
    NOW()
  );
COMMIT;