SELECT id, rule_name AS "ruleName", marks_to_award AS "marksToAward"
  FROM school_rules
  WHERE school_id = $1
  ORDER BY created_at DESC;