/**
 * authUtils.js
 *
 * Responsabilidade:
 *  - Autenticação e autorização.
 *  - Geração e validação de JWT.
 *  - Verificação de senha.
 *
 * Contexto de produto:
 *  O Mark exige que toda requisição sensível (premiar aluno, resgatar voucher,
 *  ver saldo) esteja autenticada e autorizada por papel, conforme o LLD.
 *  O HLD trata segurança e confiança como requisitos centrais porque lidamos
 *  com "saldo" e "benefícios reais" (vouchers). RBAC e assinaturas fortes de
 *  token são parte dessa confiança.
 *
 * Uso:
 *  Esse módulo (ou cópia dele) é embutido em Function Nodes do n8n:
 *   - /auth/login cria um JWT
 *   - /auth/me, /schools/rules, /awards, /students/dashboard, /vouchers/*
 *     validam o JWT e o papel (role === 'ADMIN' ou 'STUDENT')
 *
 * Observação:
 *  Em produção poderíamos usar bcrypt/argon2 para hash de senha.
 *  Nesse MVP vamos aceitar PBKDF2 via crypto nativo para reduzir dependências.
 */

const crypto = require('crypto');

// -----------------------------
// PBKDF2 password verification
// -----------------------------

/**
 * Verifica se a senha em texto puro (passwordTentative)
 * corresponde ao hash armazenado (storedHash) usando PBKDF2.
 *
 * Formato esperado do storedHash:
 *   "pbkdf2$<iterations>$<salt_base64url>$<derived_base64url>"
 *
 * Por que PBKDF2?
 *  - O n8n não garante libs externas como bcrypt por padrão.
 *  - PBKDF2 já está no módulo nativo 'crypto'.
 *  - Ainda assim fornece derivação lenta, resistente a brute force simples.
 *
 * Segurança:
 *  - Usa timingSafeEqual para evitar ataques de timing.
 *  - Em produção, podemos migrar para bcrypt/argon2 e adaptar esta função.
 */
function verifyPasswordPBKDF2(passwordTentative, storedHash) {
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    // fallback: NUNCA aceite senha pura. Se não for formato esperado,
    // rejeita para não abrir exceção de segurança silenciosa.
    return false;
  }

  const iterations = parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], 'base64url');
  const expected = Buffer.from(parts[3], 'base64url');

  const derived = crypto.pbkdf2Sync(
    passwordTentative,
    salt,
    iterations,
    expected.length,
    'sha256'
  );

  return crypto.timingSafeEqual(derived, expected);
}

// -----------------------------
// JWT helpers (HS256)
// -----------------------------

/**
 * Gera um JWT com HS256.
 *
 * payloadBase deve conter:
 * {
 *   userId: <uuid>,
 *   role: "ADMIN" | "STUDENT",
 *   schoolId: <uuid>
 * }
 *
 * O LLD exige explicitamente esse payload, pois ele é usado para RBAC
 * e escopo de escola. O front consome esse token como accessToken,
 * e envia em Authorization: Bearer <token>.
 *
 * Expiração:
 *  - O token expira (exp) para mitigar abuso.
 *  - Valor padrão: 7 dias. Produção pode reduzir.
 */
function signJWT(payloadBase, jwtSecret, expiresInSeconds = 7 * 24 * 60 * 60) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    ...payloadBase,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const h = enc(header);
  const p = enc(payload);
  const data = `${h}.${p}`;

  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}

/**
 * Valida um JWT Bearer.
 *
 * Retorna o payload (objeto) se válido; lança erro se inválido.
 *
 * Regras de segurança:
 *  - Checa assinatura HS256 com o mesmo jwtSecret.
 *  - Checa expiração (exp < now => inválido).
 *  - Esse payload é a fonte de verdade para RBAC.
 */
function verifyAndDecodeJWT(bearerHeader, jwtSecret) {
  if (!bearerHeader || !bearerHeader.toLowerCase().startsWith('bearer ')) {
    throw new Error('TOKEN_MISSING');
  }

  const token = bearerHeader.replace(/^Bearer\s+/i, '').trim();
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) throw new Error('TOKEN_MALFORMED');

  const expectedSig = crypto
    .createHmac('sha256', jwtSecret)
    .update(`${h}.${p}`)
    .digest('base64url');

  if (s !== expectedSig) {
    throw new Error('TOKEN_INVALID_SIGNATURE');
  }

  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('TOKEN_EXPIRED');
  }

  return payload;
}

/**
 * Garante que o usuário do token tem a role necessária.
 * Ex.: requireRole(payload, "ADMIN")
 *
 * O LLD/HLD exigem RBAC estrito:
 *  - ADMIN cria regras e premia alunos.
 *  - STUDENT vê dashboard e resgata voucher.
 */
function requireRole(payload, requiredRole) {
  if (payload.role !== requiredRole) {
    throw new Error('FORBIDDEN');
  }
}

module.exports = {
  verifyPasswordPBKDF2,
  signJWT,
  verifyAndDecodeJWT,
  requireRole,
};
