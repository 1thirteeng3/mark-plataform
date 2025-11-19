const crypto = require('crypto');

/**
 * Verify password using PBKDF2
 */
function verifyPasswordPBKDF2(passwordTentative, storedHash) {
    const parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
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
        'sha512'
    );

    return crypto.timingSafeEqual(derived, expected);
}

/**
 * Hash password using PBKDF2
 */
function hashPasswordPBKDF2(password) {
    const salt = crypto.randomBytes(16);
    const iterations = 100000;
    const keylen = 64;
    const digest = 'sha512';

    const derived = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);

    return `pbkdf2$${iterations}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

/**
 * Sign JWT
 */
function signJWT(payloadBase, jwtSecret, expiresInSeconds = 7 * 24 * 60 * 60) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

    const payload = {
        ...payloadBase,
        iat: now,
        exp: now + expiresInSeconds,
        iss: 'mark-platform'
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
 * Verify and Decode JWT
 */
function verifyAndDecodeJWT(bearerHeader, jwtSecretV1, jwtSecretV2 = null) {
    if (!bearerHeader || !bearerHeader.toLowerCase().startsWith('bearer ')) {
        throw new Error('TOKEN_MISSING');
    }

    const token = bearerHeader.replace(/^Bearer\s+/i, '').trim();
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) throw new Error('TOKEN_MALFORMED');

    const checkSignature = (secret) => {
        if (!secret) return false;
        const expectedSig = crypto
            .createHmac('sha256', secret)
            .update(`${h}.${p}`)
            .digest('base64url');
        return s === expectedSig;
    };

    let isValidSig = checkSignature(jwtSecretV1);
    if (!isValidSig && jwtSecretV2) {
        isValidSig = checkSignature(jwtSecretV2);
    }

    if (!isValidSig) {
        throw new Error('TOKEN_INVALID_SIGNATURE');
    }

    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
        throw new Error('TOKEN_EXPIRED');
    }

    if (payload.iss && payload.iss !== 'mark-platform') {
        throw new Error('TOKEN_INVALID_ISSUER');
    }

    return payload;
}

module.exports = {
    verifyPasswordPBKDF2,
    hashPasswordPBKDF2,
    signJWT,
    verifyAndDecodeJWT
};
