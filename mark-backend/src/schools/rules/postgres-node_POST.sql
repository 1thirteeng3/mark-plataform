INSERT INTO school_rules (id, school_id, rule_name, marks_to_award, created_at)
  VALUES (gen_random_uuid(), $1, $2, $3, NOW())
  RETURNING id, rule_name AS "ruleName", marks_to_award AS "marksToAward";