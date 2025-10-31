/**
 * Validate Body
 *
 * Objetivo:
 *   - Garantir que recebemos studentId e ruleId.
 *   - Esses dois valores definem QUAL aluno receberá os pontos e
 *     QUAL regra está sendo aplicada (que carrega o valor de pontos).
 *
 * Por que precisamos validar aqui:
 *   - Evita mandar requisição incompleta pro banco.
 *   - Se faltar campo, retornamos 400 (erro do cliente),
 *     não 500 (erro interno).
 *
 * Segurança:
 *   - Não aceitamos inputs parcialmente nulos.
 *   - Não inferimos valores mágicos.
 *
 * Saída de sucesso:
 *   Devolvemos um objeto json consolidando:
 *     { studentId, ruleId, schoolId, userId }
 *   Mantemos schoolId e userId vindos do passo anterior (VerifyAdminJWT),
 *   porque todas as queries seguintes vão precisar disso.
 */

const { studentId, ruleId } = $json;
const { schoolId, userId } = $json; // herdado de VerifyAdminJWT

if (!studentId || !ruleId) {
  // Campos ausentes → erro de validação → 400
  return [
    {
      json: {
        statusCode: 400,
        error: 'VALIDATION_ERROR',
        message: 'Campos obrigatórios ausentes: studentId, ruleId.',
      },
    },
  ];
}

// Preparar payload “limpo” para os próximos nós
return [
  {
    json: {
      studentId,
      ruleId,
      schoolId,
      userId,
      statusCode: 200,
    },
  },
];
