-- Diagnostic: Check Columns of redeemed_vouchers
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'redeemed_vouchers';
