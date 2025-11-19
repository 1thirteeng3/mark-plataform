const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

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

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    const isPasswordValid = verifyPasswordPBKDF2(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokenPayload = {
      userId: user.id,
      role: user.role,
      schoolId: user.school_id,
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_SECRET_V1, {
      expiresIn: '7d',
      issuer: 'Mark-API',
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
