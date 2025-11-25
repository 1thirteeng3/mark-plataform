-- Fix Admin User Credentials
-- Forces the password hash to match the expected 'password123_hash'

DO $$
DECLARE
    v_school_id UUID;
BEGIN
    -- Get School ID
    SELECT id INTO v_school_id FROM schools WHERE name = 'Springfield Elementary';

    -- Ensure school exists
    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'School Springfield Elementary not found. Please run the seed script first.';
    END IF;

    -- Update existing admin user if found
    UPDATE users 
    SET password_hash = 'password123_hash',
        school_id = v_school_id,
        role = 'ADMIN'
    WHERE email = 'admin@springfield.edu';

    -- If user didn't exist, insert it
    IF NOT FOUND THEN
        INSERT INTO users (school_id, name, email, password_hash, role)
        VALUES (v_school_id, 'Principal Skinner', 'admin@springfield.edu', 'password123_hash', 'ADMIN');
    END IF;
    
END $$;
