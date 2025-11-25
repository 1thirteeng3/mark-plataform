DO $$
DECLARE
    v_school_id UUID := gen_random_uuid();
BEGIN
    -- 1. Handle School/Institution Creation
    -- We need to satisfy the legacy FK to 'institutions' AND the new app usage of 'schools'
    
    -- Check if school already exists to reuse ID
    IF EXISTS (SELECT 1 FROM schools WHERE name = 'Springfield Elementary') THEN
        SELECT id INTO v_school_id FROM schools WHERE name = 'Springfield Elementary';
    END IF;

    -- Insert into institutions (Legacy FK requirement)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'institutions') THEN
        IF NOT EXISTS (SELECT 1 FROM institutions WHERE name = 'Springfield Elementary') THEN
            -- We try to use the same UUID. If institutions.id is not UUID, this might fail, 
            -- but the error log showed a UUID key, so it should be fine.
            INSERT INTO institutions (id, name) VALUES (v_school_id, 'Springfield Elementary');
        END IF;
    END IF;

    -- Insert into schools (New Schema requirement)
    IF NOT EXISTS (SELECT 1 FROM schools WHERE id = v_school_id) THEN
        INSERT INTO schools (id, name) VALUES (v_school_id, 'Springfield Elementary');
    END IF;

    -- 2. Create Admin User
    -- Password: password123 -> Hash: password123_hash (Simple hash for demo)
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@springfield.edu') THEN
        INSERT INTO users (school_id, name, email, password_hash, role)
        VALUES (v_school_id, 'Principal Skinner', 'admin@springfield.edu', 'password123_hash', 'ADMIN');
    END IF;

    -- 3. Create Student User
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'bart@springfield.edu') THEN
        INSERT INTO users (school_id, name, email, password_hash, role)
        VALUES (v_school_id, 'Bart Simpson', 'bart@springfield.edu', 'password123_hash', 'STUDENT');
    END IF;

    -- 4. Create Student Record
    -- Link student user to student table
    INSERT INTO students (user_id, school_id, marks_balance, enrollment_id, name, email)
    SELECT u.id, v_school_id, 100, 'ST-001', u.name, u.email
    FROM users u
    WHERE u.email = 'bart@springfield.edu'
    AND NOT EXISTS (SELECT 1 FROM students s WHERE s.user_id = u.id);

    -- 5. Create Test Voucher
    IF NOT EXISTS (SELECT 1 FROM voucher_catalog WHERE name = 'Krusty Burger') THEN
        INSERT INTO voucher_catalog (name, description, marks_cost, provider_product_id, is_available)
        VALUES ('Krusty Burger', 'Delicious burger', 50, 'KB-001', true);
    END IF;

END $$;
