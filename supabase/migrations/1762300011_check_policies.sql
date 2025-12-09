-- Diagnostic: Check RLS Policies and Permissions

SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename = 'school_rules';

-- Check Grants
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'school_rules';
