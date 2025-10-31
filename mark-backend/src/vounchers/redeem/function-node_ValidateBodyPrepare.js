/**
 * Validate Body & Prepare
 *
 * Objetivo:
 *   - Garantir que o corpo da requisição contenha voucherCatalogId.
 *   - Propagar studentId & schoolId para as próximas consultas.
 *
 * Contrato de entrada:
 *   {
 *     "voucherCatalogId": "uuid_do_voucher"
 *   }
 *
 * Regras:
 *   - Sem esse ID, não sabemos qual voucher tentar resgatar.
 *   - Não tentamos inferir nada automaticamente.
 */

const { voucherCatalogId } = $json;
const { studentId, schoolId } = $json;

if (!voucherCatalogId) {
  return [
    {
      json: {
        statusCode: 400,
        error: 'VALIDATION_ERROR',
        message: 'voucherCatalogId é obrigatório.',
      },
    },
  ];
}

return [
  {
    json: {
      voucherCatalogId,
      studentId,
      schoolId,
      statusCode: 200,
    },
  },
];
