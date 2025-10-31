/**
 * responseUtils.js
 *
 * Responsabilidade:
 *  Padronizar a saída JSON dos endpoints.
 *
 * Por quê?
 *  O LLD define:
 *   - camelCase em todas as chaves de resposta
 *   - status HTTP coerente (200, 201, 400, 401, 403, 404, 500)
 *   - mensagens de erro consistentes tipo:
 *     {
 *        "statusCode": 400,
 *        "message": "Saldo insuficiente.",
 *        "error": "INSUFFICIENT_FUNDS"
 *     }
 *
 *  Essa consistência é crucial pro frontend e pra auditoria.
 */

function success(body, statusCode = 200) {
  return {
    statusCode,
    body,
  };
}

/**
 * Cria um objeto de erro consistente.
 *
 * Exemplos de uso:
 *  - 400 dados inválidos
 *  - 401 token faltando/invalidado
 *  - 403 role errada
 *  - 404 recurso não existe
 *  - 500 erro interno/transação falhou
 */
function failure(statusCode, message, errorCode, details = null) {
  const payload = {
    statusCode,
    message,
    error: errorCode,
  };
  if (details) payload.details = details;
  return {
    statusCode,
    body: payload,
  };
}

module.exports = {
  success,
  failure,
};
