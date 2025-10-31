/**
 * VerifyStudentJWT — Function Node n8n
 *
 * Responsabilidade:
 *   Validar JWT e garantir que o usuário tem role === 'STUDENT'.
 *
 * Requisitos:
 *   - Payload JWT contém { userId, role, schoolId }.
 *   - Token assinado com HS256 e expiração válida.
 *   - Retornar erro 403 se role != STUDENT.
 *
 * Contexto:
 *   Usado em endpoints:
 *     - /students/dashboard
 *     - /vouchers/catalog
 *     - /vouchers/redeem
 */

const crypto = require('crypto');

function unauthorized(message, code) {
  return [
    {
      json: {
        statusCode: 401,
        message,
        error: code,
      },
    },
  ];
}

function forbidden(message) {
  return [
    {
      json: {
        statusCode: 403,
        message,
        error: 'FORBIDDEN',
      },
    },
  ];
}

const header = this.getHeader('authorization');
if (!header || !header.startsWith('Bearer ')) return unauthorized('Token ausente.', 'TOKEN_MISSING');

const token = header.replace(/^Bearer\s+/i, '').trim();
const [h, p, s] = token.split('.');
if (!h || !p || !s) return unauthorized('Token malformado.', 'TOKEN_MALFORMED');

const recalculated = crypto
  .createHmac('sha256', process.env.JWT_SECRET)
  .update(`${h}.${p}`)
  .digest('base64url');

if (s !== recalculated) return unauthorized('Assinatura inválida.', 'TOKEN_INVALID_SIGNATURE');

const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
if (payload.exp && payload.exp < Math.floor(Date.now() / 1000))
  return unauthorized('Token expirado.', 'TOKEN_EXPIRED');

// RBAC check
if (payload.role !== 'STUDENT') return forbidden('Acesso negado. Somente alunos.');

return [
  {
    json: {
      userId: payload.userId,
      role: payload.role,
      schoolId: payload.schoolId,
    },
  },
];
