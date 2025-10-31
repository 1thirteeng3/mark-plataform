SELECT
  id,
  marks_balance AS balance,
  school_id
FROM students
WHERE id = $1
  AND school_id = $2;
