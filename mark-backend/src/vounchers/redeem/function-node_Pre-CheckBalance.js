/**
 * Pre-check Balance
 *
 * Objetivo:
 *   - Validar disponibilidade do voucher.
 *   - Validar existência do aluno.
 *   - Checar saldo suficiente.
 *
 * Motivo:
 *   - Evita iniciar transação se já sabemos que não vai fechar
 *     (por exemplo: saldo insuficiente).
 *
 * Saída de sucesso:
 *   - Gera um objeto consolidado com:
 *       amountToDebit (cost),
 *       provider,
 *       currency,
 *       etc.
 *   - Esses dados serão usados:
 *       a) na transação financeira (DEBIT + ledger)
 *       b) na chamada externa ao provedor
 *       c) na resposta final ao aluno
 */

const voucherRows = $items('Postgres - Load Voucher Option')[0]?.json?.data || [];
const studentRows = $items('Postgres - Load Student Balance')[0]?.json?.data || [];

const voucher = voucherRows[0];
const student = studentRows[0];

if (!voucher) {
  // voucher não encontrado / não disponível / não pertence à escola
  return [
    {
      json: {
        statusCode: 404,
        error: 'VOUCHER_NOT_FOUND_OR_UNAVAILABLE',
        message: 'Voucher não encontrado ou indisponível.',
      },
    },
  ];
}

if (!student) {
  // aluno não encontrado (o que não deveria acontecer se JWT está certo,
  // mas ainda é uma checagem defensiva)
  return [
    {
      json: {
        statusCode: 404,
        error: 'STUDENT_NOT_FOUND',
        message: 'Aluno não encontrado.',
      },
    },
  ];
}

// Checar saldo suficiente
if (student.balance < voucher.cost) {
  return [
    {
      json: {
        statusCode: 400,
        error: 'INSUFFICIENT_FUNDS',
        message: 'Saldo insuficiente para resgatar este voucher.',
        currentBalance: student.balance,
        voucherCost: voucher.cost,
      },
    },
  ];
}

// Se tudo ok, propagamos dados para a fase transacional.
// Vamos precisar registrar o resgate como PENDING antes de chamar o provedor.
return [
  {
    json: {
      studentId: student.id,
      schoolId: student.school_id,
      voucherCatalogId: voucher.id,
      cost: voucher.cost,
      provider: voucher.provider,
      value: voucher.value,
      currency: voucher.currency,
      imageUrl: voucher.imageUrl,
      statusCode: 200,
    },
  },
];
