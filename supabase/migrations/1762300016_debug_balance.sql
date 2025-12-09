-- Diagnostic: Check Balance vs Voucher Cost
-- Run this to see why "Insufficient Balance" is happening.

SELECT 
    'Student' as type,
    s.id,
    s.email,
    s.marks_balance,
    '---' as cost
FROM students s
WHERE s.email = 'bart@springfield.edu'

UNION ALL

SELECT 
    'Voucher' as type,
    v.id,
    v.name,
    NULL as marks_balance,
    v.marks_cost::text as cost
FROM voucher_catalog v

UNION ALL

SELECT 
    'Pending_Redemptions' as type,
    student_id,
    status::text,
    NULL,
    voucher_catalog_id::text
FROM redeemed_vouchers
WHERE status = 'PENDING';
