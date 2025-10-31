/**
 * /schools/rules — POST (ADMIN)
 *
 * Pipeline:
 *   Webhook → VerifyAdminJWT → Function (validação) → Postgres (INSERT) → Respond
 *
 * Descrição:
 *   Permite ao administrador criar novas regras de pontuação.
 *   Campos obrigatórios: ruleName, marksToAward.
 */

const { ruleName, marksToAward } = $json;
const schoolId = $json.schoolId;

if (!ruleName || typeof marksToAward !== 'number') {
  return [
    {
      json: {
        statusCode: 400,
        message: 'Campos obrigatórios: ruleName (string) e marksToAward (number).',
        error: 'VALIDATION_ERROR'
      }
    }
  ];
}

// SQL de inserção conforme LLD (Seção 3 - Banco de Dados)
const query = `
  INSERT INTO school_rules (id, school_id, rule_name, marks_to_award, created_at)
  VALUES (gen_random_uuid(), $1, $2, $3, NOW())
  RETURNING id, rule_name AS "ruleName", marks_to_award AS "marksToAward";
`;

return [
  {
    json: {
      sql: query,
      values: [schoolId, ruleName, marksToAward],
      info: 'Executar via Postgres → retornar objeto criado com 201.'
    }
  }
];
