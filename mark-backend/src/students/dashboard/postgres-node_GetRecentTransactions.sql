SELECT
  id,
  type,
  amount,
  description,
  created_at AS "createdAt"
FROM ledger_transactions
WHERE student_id = $1
ORDER BY created_at DESC
LIMIT 10;
