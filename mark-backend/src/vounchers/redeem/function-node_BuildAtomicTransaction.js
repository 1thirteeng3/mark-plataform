/**
 * Build Atomic Transaction (DEBIT + PENDING)
 *
 * Objetivo:
 *   - Gerar o bloco SQL transacional que:
 *       BEGIN;
 *         1. Debita saldo do aluno
 *         2. Cria redeemed_vouchers com status 'PENDING'
 *         3. Registra no ledger um DEBIT
 *       COMMIT;
 *
 *   - Não chamamos ainda o provedor externo aqui.
 *     Primeiro marcamos o resgate como PENDING internamente,
 *     garantindo rastreabilidade caso a integração externa falhe.
 *
 * Observação:
 *   - Vamos precisar do ID gerado para redeemed_vouchers para
 *     atualizar depois com o voucher_code do provedor.
 *   - Aqui podemos usar gen_random_uuid() no Postgres.
 *
 * Saída:
 *   - sql: script transacional
 *   - values: parâmetros [$1, $2, ...] na ordem correta
 *   - redeemedDraftInfo: dados que carregamos pra próxima etapa
 */

const {
  studentId,
  voucherCatalogId,
  cost,
  provider,
  value,
  currency,
} = $json;

// Criamos uma descrição legível para o ledger
const debitDescription = `Resgate de voucher ${provider} (${value} ${currency})`;

// IMPORTANTE: Precisamos capturar o id que será inserido em redeemed_vouchers
// para depois atualizar com COMPLETED e voucher_code.
// Estratégia comum:
// - Gerar UUID no próprio SQL com gen_random_uuid(), mas retornar via RETURNING.
// Porém, muitos ambientes n8n/Postgres node só aceitam uma única string de query.
// Se o Postgres node que você usa suporta múltiplos statements + RETURNING
// no meio da transação e ainda assim propaga resultados, perfeito.
// Se NÃO suportar, temos duas abordagens:
//    A) usar DO / plpgsql;
//    B) fazer a transação manualmente com BEGIN/ROLLBACK via múltiplos nós.
// Aqui vou escrever o ideal conceitual com RETURNING, e você pode adaptar.

const sql = `
BEGIN;

  -- 1. Debitar saldo do aluno
  UPDATE students
  SET marks_balance = marks_balance - $1
  WHERE id = $2;

  -- 2. Criar registro PENDING em redeemed_vouchers
  --    Esse registro representa um pedido de voucher ainda não finalizado externamente.
  --    Ele garante auditoria mesmo se o provedor externo falhar depois.
  WITH inserted_voucher AS (
    INSERT INTO redeemed_vouchers (
      id,
      student_id,
      voucher_catalog_id,
      status,
      voucher_code,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      $2,
      $3,
      'PENDING',
      NULL,
      NOW()
    )
    RETURNING id
  )

  -- 3. Criar linha de débito no ledger (DEBIT)
  INSERT INTO ledger_transactions (
    id,
    student_id,
    type,
    amount,
    description,
    source_rule_id,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    $2,
    'DEBIT',
    $1,
    $4,
    NULL,
    NOW()
  );

COMMIT;
`;

// IMPORTANTE: Observe a ordem dos placeholders
// $1 = cost
// $2 = studentId
// $3 = voucherCatalogId
// $4 = debitDescription
const values = [
  cost,
  studentId,
  voucherCatalogId,
  debitDescription,
];

// Esse node devolve tudo que o próximo nó precisa
return [
  {
    json: {
      sql,
      values,
      provider,
      value,
      currency,
      cost,
      voucherCatalogId,
      studentId,
      statusCode: 200,
    },
  },
];
