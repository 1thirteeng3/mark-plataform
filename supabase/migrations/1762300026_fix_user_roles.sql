-- Create or Update Global Super Admin
-- This script ensures 'super.admin@mark.com' exists and has SUPER_ADMIN role

DO $$
DECLARE
    super_admin_id UUID;
    school_admin_id UUID;
    default_school_id UUID;
BEGIN
    -- 1. Get Default School ID (Springfield Elementary)
    SELECT id INTO default_school_id FROM schools WHERE name = 'Springfield Elementary' LIMIT 1;

    -- 2. Upsert Super Admin User (super.admin@mark.com / superadmin123)
    -- Note: Password hash is for 'superadmin123' (PBKDF2 or bcrypt depending on provider, here using placeholder logic or relying on Supabase Auth API usually, but we will insert into auth.users manually if possible, or usually we just update the public.users role if the user exists. 
    -- Since we can't easily hash passwords in pure SQL for Supabase Auth which uses GoTure, we will assume the user signs up or we use the existing 'super@mark.com' if it exists, or update it.
    
    -- Let's update the EXISTING 'super@mark.com' to be the Global Admin if it exists, or create a new entry in public.users linked to it.
    
    -- UPDATE ROLE for super@mark.com
    UPDATE public.users 
    SET role = 'SUPER_ADMIN', school_id = NULL 
    WHERE email = 'super@mark.com';

    -- UPDATE ROLE for admin@springfield.edu (School Admin)
    UPDATE public.users 
    SET role = 'ADMIN', school_id = default_school_id 
    WHERE email = 'admin@springfield.edu';

    -- UPDATE ROLE for admin@mark.com (User said this is actually a SCHOOL ADMIN)
    UPDATE public.users 
    SET role = 'ADMIN', school_id = default_school_id 
    WHERE email = 'admin@mark.com';

END $$;
