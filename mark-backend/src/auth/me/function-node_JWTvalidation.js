/**
 * /auth/me  — Function Node n8n
 *
 * Responsabilidade:
 *   Retornar informações do usuário autenticado com base no token JWT.
 *
 * Requisitos (LLD / HLD):
 *   - JWT assinado com HS256, payload: { userId, role, schoolId }
 *   - Header: Authorization: Bearer <token>
 *   - Resposta em camelCase, conforme contrato.
 *   - Erros padronizados (statusCode + mensagem).
 *
 * Contexto de produto:
 *   O token é o elo entre as camadas — garante que o aluno/gestor é quem diz ser.
 *   Este endpoint é usado pelo front para recuperar o perfil atual e validar sessão.
 *
 * Segurança:
 *   - Garante que o token é válido e não expirou.
 *   - Decodifica e retorna payload sem expor segredos.
 *   - Opera em HTTPS (requisito RNF do HLD).
 */

const crypto = require('crypto');

// --------------------------------------------------------------
// 1️⃣ Captura e valida o header Authorization
// --------------------------------------------------------------

const authHeader = this.getHeader('authorization'); // lê o header HTTP

if (!authHeader || !authHeader.startsWith('Bearer ')) {
  // O header está ausente ou malformado → erro 401
  return [
    {
      json: {
        statusCode: 401,
        message: 'Token ausente ou inválido.',
        error: 'UNAUTHORIZED',
      },
    },
  ];
}

// remove o prefixo "Bearer " e guarda o token limpo
const token = authHeader.replace(/^Bearer\s+/i, '').trim();

// --------------------------------------------------------------
// 2️⃣ Separa o JWT em 3 partes: header, payload, signature
// --------------------------------------------------------------

const [encodedHeader, encodedPayload, signature] = token.split('.');
if (!encodedHeader || !encodedPayload || !signature) {
  return [
    {
      json: {
        statusCode: 401,
        message: 'Token malformado.',
        error: 'TOKEN_MALFORMED',
      },
    },
  ];
}

// --------------------------------------------------------------
// 3️⃣ Verifica a assinatura HMAC SHA256 usando JWT_SECRET do ambiente
// --------------------------------------------------------------
//
// Por que assim?
//  - O LLD define HS256 como método de assinatura.
//  - O segredo (JWT_SECRET) está no .env e nunca no código-fonte.
//  - Isso garante integridade e autenticidade do token.
//
const recalculatedSignature = crypto
  .createHmac('sha256', process.env.JWT_SECRET)
  .update(`${encodedHeader}.${encodedPayload}`)
  .digest('base64url');

if (signature !== recalculatedSignature) {
  return [
    {
      json: {
        statusCode: 401,
        message: 'Assinatura do token inválida.',
        error: 'TOKEN_INVALID_SIGNATURE',
      },
    },
  ];
}

// --------------------------------------------------------------
// 4️⃣ Decodifica o payload Base64URL e parseia para JSON
// --------------------------------------------------------------
let payload;
try {
  payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
} catch (err) {
  return [
    {
      json: {
        statusCode: 401,
        message: 'Falha ao decodificar o token.',
        error: 'TOKEN_DECODE_ERROR',
      },
    },
  ];
}

// --------------------------------------------------------------
// 5️⃣ Verifica expiração (campo exp)
// --------------------------------------------------------------

const now = Math.floor(Date.now() / 1000);
if (payload.exp && payload.exp < now) {
  return [
    {
      json: {
        statusCode: 401,
        message: 'Token expirado.',
        error: 'TOKEN_EXPIRED',
      },
    },
  ];
}

// --------------------------------------------------------------
// 6️⃣ Monta resposta de sucesso conforme contrato do LLD
// --------------------------------------------------------------
//
// Retornamos apenas dados necessários — sem segredos.
// Payload esperado:
//   { userId, role, schoolId, exp, iat }
//
return [
  {
    json: {
      user: {
        id: payload.userId,
        role: payload.role,
        schoolId: payload.schoolId,
      },
      statusCode: 200,
    },
  },
];
