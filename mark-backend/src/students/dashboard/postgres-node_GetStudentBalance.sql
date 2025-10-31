SELECT marks_balance AS balance
FROM students
WHERE id = $1 AND school_id = $2;
