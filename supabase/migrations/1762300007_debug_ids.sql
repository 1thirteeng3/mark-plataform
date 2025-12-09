-- Diagnostic: Check School IDs for mismatch

SELECT 
    'Student' as type,
    s.name as student_name,
    s.school_id as student_school_id,
    sch.name as school_name
FROM students s
JOIN schools sch ON s.school_id = sch.id
WHERE s.email = 'bart@springfield.edu'

UNION ALL

SELECT 
    'Rule' as type,
    r.rule_name as rule_name,
    r.school_id as rule_school_id,
    sch.name as school_name
FROM school_rules r
JOIN schools sch ON r.school_id = sch.id
WHERE r.rule_name = 'Participação em Aula'

UNION ALL

SELECT 
    'School_List' as type,
    name,
    id,
    '---'
FROM schools
WHERE name = 'Springfield Elementary';
