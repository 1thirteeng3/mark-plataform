/**
 * /schools/rules — GET (ADMIN)
 *
 * Pipeline:
 *   Webhook → VerifyAdminJWT → Postgres → Respond
 *
 * Descrição:
 *   Retorna todas as regras da escola vinculada ao admin.
 *   Cada regra contém: id, ruleName, marksToAward.
 */

const schoolId = $json.schoolId; // vem do VerifyAdminJWT
if (!schoolId) {
  return [{ json: { statusCode: 400, message: 'schoolId não informado no token.' } }];
}

const query = `
  SELECT id, rule_name AS "ruleName", marks_to_award AS "marksToAward"
  FROM school_rules
  WHERE school_id = $1
  ORDER BY created_at DESC;
`;

return [
  {
    json: {
      sql: query,
      values: [schoolId],
      info: 'Executar via nó Postgres → Retornar array sem envelope conforme LLD.'
    }
  }
];
