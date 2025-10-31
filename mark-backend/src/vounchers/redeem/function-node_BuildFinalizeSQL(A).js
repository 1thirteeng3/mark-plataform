// Build Finalize SQL (abordagem A)
const voucherCode = $json.data?.voucherCode || 'MOCK-VOUCHER';
const redeemedVoucherId = $json.redeemedVoucherId;

if (!redeemedVoucherId) {
  throw new Error('redeemedVoucherId não encontrado — o fluxo precisa receber o ID retornado na criação do voucher.');
}

const sql = `
UPDATE redeemed_vouchers
SET status = 'COMPLETED',
    voucher_code = $1
WHERE id = $2;
`;

return [{
  json: {
    sql,
    params: [voucherCode, redeemedVoucherId],
    statusCode: 200
  }
}];
