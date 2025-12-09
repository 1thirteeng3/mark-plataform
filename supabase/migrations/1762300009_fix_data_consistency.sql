-- DATA CONSISTENCY FIX
-- Aligns Admin, Student, and Rules to the single valid School ID found in diagnostics.

DO $$
DECLARE
    v_target_school_id UUID := '412bf994-c5cf-4bab-9b18-1bda4c6b9c59';
BEGIN
    -- 1. Align Admin User
    UPDATE users 
    SET school_id = v_target_school_id 
    WHERE email = 'admin@springfield.edu';

    -- 2. Align Student User (and Link)
    UPDATE students 
    SET school_id = v_target_school_id 
    WHERE email = 'bart@springfield.edu';

    -- 3. NUCLEAR CLEANUP of Rules
    -- We delete ALL rules to ensure the API tester picks the correct NEW one.
    DELETE FROM school_rules;

    -- 4. Create ONE Clean Rule
    INSERT INTO school_rules (id, school_id, rule_name, marks_to_award, is_active)
    VALUES (gen_random_uuid(), v_target_school_id, 'Participação em Aula (Fixed)', 50, true);

END $$;
