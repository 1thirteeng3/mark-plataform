-- FINAL PRODUCTION VERIFICATION
-- Run this to confirm you are ready to log in.

SELECT 'Users (Should be 1 - Admin)' as check_name, count(*) as count FROM users
UNION ALL
SELECT 'Students (Should be 0)', count(*) FROM students
UNION ALL
SELECT 'Vouchers (Should be 3)', count(*) FROM voucher_catalog
UNION ALL
SELECT 'Schools (Should be 1)', count(*) FROM schools;

-- Check Admin
SELECT id, email, role, 'READY_TO_LOGIN' as status 
FROM users 
WHERE email = 'admin@mark.com';
