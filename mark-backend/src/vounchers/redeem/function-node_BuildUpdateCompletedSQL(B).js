/**
 * Build Update Completed SQL
 *
 * Objetivo:
 *   - Receber o pendingId que veio da query anterior.
 *   - Montar UPDATE para marcar como COMPLETED e salvar o voucher_code.
 *
 * Importante:
 *   - Esse é o momento em que o aluno “ganha” oficialmente o voucher.
 */

const pendingRow = $items('Postgres - Select Pending Redeem')[0]?.json?.data?.[0];
if (!pendingRow) {
  // Isso é MUITO sério: quer dizer que debitamos saldo
  // mas não encontramos o registro PENDING.
  // Nesta situação, a aplicação deve acionar alerta/monitoramento.
  return [
    {
      json: {
        statusCode: 500,
        error: 'REDEEM_STATE_DESYNC',
        message: 'Não foi possível finalizar o resgate. Contate o suporte.',
      },
    },
  ];
}

const pendingId = pendingRow.id;

const { voucherCode } = $json;

const sqlFinalize = `
UPDATE redeemed_vouchers
SET status = 'COMPLETED',
    voucher_code = $1
WHERE id = $2;
`;

return [
  {
    json: {
      sqlFinalize,
      valuesFinalize: [voucherCode, pendingId],
      // propagamos info útil pro response final:
      voucherCode,
      instructions: $json.instructions,
      statusCode: 200,
    },
  },
];

//O Postgres Node seguinte roda esse sqlFinalize e pronto: a operação está concluída do ponto de vista de negócio.