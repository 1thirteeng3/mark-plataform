-- Seed School Rule
-- Required for Phase 1 verification

DO $$
DECLARE
    v_school_id UUID;
    v_rule_id UUID;
BEGIN
    -- Get School ID
    SELECT id INTO v_school_id FROM schools WHERE name = 'Springfield Elementary';

    -- Create Rule if not exists
    IF v_school_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM school_rules WHERE school_id = v_school_id AND rule_name = 'Participação em Aula') THEN
            INSERT INTO school_rules (school_id, rule_name, marks_to_award, is_active)
            VALUES (v_school_id, 'Participação em Aula', 50, true)
            RETURNING id INTO v_rule_id;
        END IF;
    END IF;

END $$;
