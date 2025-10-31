SELECT
  id,
  rule_name,
  marks_to_award
FROM school_rules
WHERE id = $1
  AND school_id = $2;
