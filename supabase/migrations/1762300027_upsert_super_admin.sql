-- Ensure Super Admin Exists in Public Users (Fixed: Includes password_hash)
-- This script safely inserts the Super Admin if missing, or updates if exists.

INSERT INTO public.users (id, email, name, role, school_id, password_hash, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001', -- Fixed ID for Demo Super Admin
    'super@mark.com',
    'Super Valid Admin',
    'SUPER_ADMIN',
    NULL, -- Global Admin has no school
    'hashed_password_placeholder', -- Required by DB constraint
    NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
    role = 'SUPER_ADMIN', 
    school_id = NULL,
    name = 'Super Valid Admin';

-- Also ensure 'admin@mark.com' is a School Admin (as per your request)
-- assigning them to the first available school
UPDATE public.users 
SET role = 'ADMIN', 
    school_id = (SELECT id FROM schools LIMIT 1)
WHERE email = 'admin@mark.com';

-- Verify the result
SELECT email, role, school_id FROM public.users WHERE email IN ('super@mark.com', 'admin@mark.com');
