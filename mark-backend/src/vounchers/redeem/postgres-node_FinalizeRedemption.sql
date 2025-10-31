studentId,
  voucherCatalogId,
  voucherCode,
  instructions, // pode ir pra resposta final mesmo que não salve no banco agora

SELECT id
FROM redeemed_vouchers
WHERE student_id = $1
  AND voucher_catalog_id = $2
  AND status = 'PENDING'
ORDER BY created_at DESC
LIMIT 1;