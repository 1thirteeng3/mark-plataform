// Build Update Completed SQL (auditoria opcional)
const voucherCode = $json.data?.voucherCode || 'MOCK-VOUCHER';
const redemptionId = $json.redeemedVoucherId;

const sql = `
BEGIN;
UPDATE redeemed_vouchers
SET status = 'COMPLETED',
    voucher_code = $1
WHERE id = $2;

UPDATE ledger_transactions
SET source_redemption_id = $2
WHERE student_id = $3
  AND type = 'DEBIT'
  AND source_redemption_id IS NULL
ORDER BY created_at DESC
LIMIT 1;
COMMIT;
`;

return [{
  json: {
    sql,
    params: [voucherCode, redemptionId, $json.studentId]
  }
}];
