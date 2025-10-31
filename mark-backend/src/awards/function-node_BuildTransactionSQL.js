/**
 * Build Transaction SQL
 *
 * Objetivo:
 *   - Combinar os dados coletados dos nós anteriores:
 *       • regra (marks_to_award, rule_name)
 *       • aluno (studentId, saldo atual)
 *   - Criar o bloco SQL transacional que:
 *       1. BEGIN;
 *       2. UPDATE students.marks_balance += marks_to_award;
 *       3. INSERT ledger_transactions (type='CREDIT', amount, description, source_rule_id, student_id, created_at NOW());
 *       4. COMMIT;
 *
 * Por que transação?
 *   - O HLD é explícito: crédito precisa ser atômico.
 *     Se falhar o INSERT no ledger, não pode ter atualizado o saldo sozinho.
 *   - Ledger serve como trilha de auditoria e não deve ser editado depois.
 *
 * Segurança:
 *   - Não existe UPDATE em ledger_transactions.
 *     Cada crédito é um fato histórico permanente.
 *   - description grava o motivo do crédito de forma legível:
 *     isso é útil para auditoria e para o dashboard do aluno.
 *
 * Saída de erro:
 *   - Se regra ou aluno não existirem (ou não forem da mesma escola),
 *     retornamos 404.
 *
 * Saída de sucesso:
 *   - Retornamos json contendo:
 *       sql  → o script transacional
 *       values → os bindings para queryParams
 *       studentId / ruleId / amount → para construir a resposta final
 */

const ruleNodeItems = $items('Postgres - Get Rule')[0]?.json?.data || [];
const studentNodeItems = $items('Postgres - Get Student')[0]?.json?.data || [];

const rule = ruleNodeItems[0];
const student = studentNodeItems[0];

if (!rule || !student) {
  // Ou a regra não existe / não pertence à escola do admin,
  // ou o aluno não existe / não pertence à escola do admin.
  return [
    {
      json: {
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'Regra ou aluno não encontrado para esta escola.',
      },
    },
  ];
}

// Quantos Marks essa regra concede
const amountToCredit = rule.marks_to_award;

// Descrição amigável que vai ficar no ledger_transactions.
// Isso é importante para auditoria e para mostrar no extrato do aluno.
const description = `Crédito por Regra: ${rule.rule_name}`;

// Montamos um bloco SQL atômico.
// IMPORTANTE: isso pressupõe que o Postgres Node seguinte aceita múltiplos statements.
// Em setups mais rígidos, você faria BEGIN/COMMIT em um nó separado ou usaria stored procedure.
const sql = `
BEGIN;
  UPDATE students
    SET marks_balance = marks_balance + $1
  WHERE id = $2;

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
    'CREDIT',
    $1,
    $3,
    $4,
    NOW()
  );
COMMIT;
`;

// Atenção para a ordem dos placeholders ($1, $2, $3, $4)
const values = [
  amountToCredit,   // $1 = quanto vamos somar / registrar
  student.id,       // $2 = student_id alvo
  description,      // $3 = descrição humana
  rule.id,          // $4 = source_rule_id (qual regra gerou isso)
];

// Passamos também studentId/ruleId/amount pro nó de resposta final
return [
  {
    json: {
      sql,
      values,
      studentId: student.id,
      ruleId: rule.id,
      marksCredited: amountToCredit,
      statusCode: 200,
    },
  },
];
