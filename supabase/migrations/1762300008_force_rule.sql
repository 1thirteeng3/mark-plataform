-- Force Create Rule for School ID: 412bf994-c5cf-4bab-9b18-1bda4c6b9c59
DO $$
DECLARE
    v_school_id UUID := '412bf994-c5cf-4bab-9b18-1bda4c6b9c59';
BEGIN
    -- Delete if exists (to be clean)
    DELETE FROM school_rules WHERE rule_name = 'Participação em Aula' AND school_id = v_school_id;

    -- Insert fresh
    INSERT INTO school_rules (school_id, rule_name, marks_to_award, is_active)
    VALUES (v_school_id, 'Participação em Aula', 50, true);
    
END $$;
