/**
 * Build Finalize SQL
 *
 * Objetivo:
 *   - Montar o SQL que:
 *       1. Encontra o último redeemed_vouchers PENDING do aluno para aquele catálogo
 *       2. Seta status = 'COMPLETED'
 *       3. Grava voucher_code
 *
 * Essa abordagem é defensiva: ela assume que acabamos de criar esse PENDING,
 * então ele será o mais recente para esse aluno + voucherCatalogId.
 *
 * Em produção, o ideal é carregar e propagar explicitamente o ID do redeemed_vouchers
 * criado na transação anterior, e usar esse ID diretamente.
 */

const {
  studentId,
  voucherCatalogId,
  voucherCode,
  instructions, // pode ir pra resposta final mesmo que não salve no banco agora
} = $json;

// SQL em duas etapas:
// 1. Buscar o id do último registro PENDING
// 2. Atualizar esse registro
//
// Dependendo do nível de rigidez do n8n/Postgres node, você pode precisar
// quebrar isso em dois nós (SELECT depois UPDATE).
//
// Vou montar aqui em duas queries separadas, como se fossem dois nós:

// 1) Query para pegar o último pendingId
const sqlSelectPending = `
SELECT id
FROM redeemed_vouchers
WHERE student_id = $1
  AND voucher_catalog_id = $2
  AND status = 'PENDING'
ORDER BY created_at DESC
LIMIT 1;
`;

return [
  {
    json: {
      sqlSelectPending,
      valuesSelectPending: [studentId, voucherCatalogId],
      voucherCode,
      instructions,
      studentId,
      voucherCatalogId,
      statusCode: 200,
    },
  },
];
