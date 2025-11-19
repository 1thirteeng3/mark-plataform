/**
 * checkPasswordAndSignJWT
 *
 * Responsabilidade:
 *  - Validar credenciais.
 *  - Assinar o JWT.
 *  - Montar a resposta no formato do LLD.
 *
 * Contexto:
 *  O LLD exige que o backend retorne:
 *    {
 *      accessToken: <jwt>,
 *      user: { id, name, email, role }
 *    }
 *  e que o JWT contenha userId, role, schoolId.
 *
 * Segurança:
 *  - Se a senha estiver errada, retornamos 401, mensagem genérica.
 *  - Não revelamos qual campo está errado (email ou senha).
 *
 * Produto:
 *  O JWT emitido aqui é usado em TODO o resto do sistema:
 *   - /auth/me
 *   - /schools/rules (ADMIN)
 *   - /awards (ADMIN → CREDIT)
 *   - /students/dashboard (STUDENT)
 *   - /vouchers/* (STUDENT)
 */

const crypto = require('crypto');

// Helpers "locais" equivalentes às funções do nosso authUtils.js.
// No n8n você pode copiar esse bloco, ou injetar via código compartilhado se estiver usando n8n self-host customizado.

// --- PBKDF2 password hashing (for reference) ---
// New passwords should be stored in this format.
function hashPasswordPBKDF2(password) {
  const salt = crypto.randomBytes(16);
  const iterations = 100000;
  const keylen = 64;
  const digest = 'sha512';

  const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);

  // Store as "pbkdf2$<iterations>$<keylen>$<salt>$<hash>"
  return `pbkdf2$${iterations}$${keylen}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}


// --- PBKDF2 password check (upgraded) ---
// Supports both old and new hash formats for graceful migration.
function verifyPasswordPBKDF2(passwordTentative, storedHash) {
  const parts = storedHash.split('$');

  // New format: pbkdf2$<iterations>$<keylen>$<salt>$<hash>
  if (parts.length === 5 && parts[0] === 'pbkdf2') {
      const iterations = parseInt(parts[1], 10);
      const keylen = parseInt(parts[2], 10);
      const salt = Buffer.from(parts[3], 'base64url');
      const expected = Buffer.from(parts[4], 'base64url');

      const derived = crypto.pbkdf2Sync(
        passwordTentative,
        salt,
        iterations,
        keylen,
        'sha512'
      );
      return crypto.timingSafeEqual(derived, expected);

  // Old format: pbkdf2$<iterations>$<salt>$<hash>
  } else if (parts.length === 4 && parts[0] === 'pbkdf2') {
    const iterations = parseInt(parts[1], 10);
    const salt = Buffer.from(parts[2], 'base64url');
    const expected = Buffer.from(parts[3], 'base64url');

    const derived = crypto.pbkdf2Sync(
        passwordTentative,
        salt,
        iterations,
        expected.length,
        'sha256' // Old digest
    );
    return crypto.timingSafeEqual(derived, expected);
  }

  // Not a recognized pbkdf2 format
  return false;
}

// --- JWT sign (upgraded) ---
// Signs with the NEW key (V1). Verification logic (in another middleware)
// should check against V1 and V2 to support key rotation.
function signJWT(payloadBase, expiresInSeconds = 7 * 24 * 60 * 60) {
  const header = { alg: 'HS512', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    ...payloadBase,
    iat: now,
    exp: now + expiresInSeconds,
    iss: "Mark-API", // Strict issuer validation
  };

  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

  const h = enc(header);
  const p = enc(payload);
  const data = `${h}.${p}`;

  const signature = crypto
    .createHmac('sha512', process.env.JWT_SECRET_V1) // Use new secret & algorithm
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}

// -------------------------------------------------------
// Corpo real da lógica do node
// -------------------------------------------------------

if (!items || !items.length || !items[0].json) {
  // Nenhum usuário encontrado com esse email
  return [
    {
      json: {
        statusCode: 401,
        message: "Credenciais inválidas.",
        error: "UNAUTHORIZED",
        isAuthError: true,
      },
    },
  ];
}

const row = items[0].json;

// Valida senha
const isOk = verifyPasswordPBKDF2($json.password, row.password_hash);
if (!isOk) {
  return [
    {
      json: {
        statusCode: 401,
        message: "Credenciais inválidas.",
        error: "UNAUTHORIZED",
        isAuthError: true,
      },
    },
  ];
}

// Assina JWT com dados exigidos pelo LLD
const tokenPayload = {
  userId: row.id,
  role: row.role,
  schoolId: row.school_id,
};

const jwt = signJWT(tokenPayload);

// Monta resposta final no padrão camelCase exigido pelo LLD
return [
  {
    json: {
      accessToken: jwt,
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
      },
      statusCode: 200,
    },
  },
];
