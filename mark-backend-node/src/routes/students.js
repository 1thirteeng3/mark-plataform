const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

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

router.post('/batch-import', async (req, res) => {
  const { students } = req.body;

  if (!students || !Array.isArray(students)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const validatedStudents = [];
  const errors = [];

  for (const student of students) {
    if (!student.email || !student.fullName || !student.className || !student.schoolRegistrationNumber) {
      errors.push({ student, error: 'Missing required fields' });
      continue;
    }

    if (validatedStudents.find(s => s.email === student.email)) {
      errors.push({ student, error: 'Duplicate email in batch' });
      continue;
    }

    validatedStudents.push(student);
  }

  const studentsWithPasswords = validatedStudents.map(student => {
    const temporaryPassword = crypto.randomBytes(8).toString('hex');
    student.passwordHash = hashPasswordPBKDF2(temporaryPassword);
    student.temporaryPassword = temporaryPassword; // For reporting purposes only
    return student;
  });

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const userInsertQuery = 'INSERT INTO users (full_name, email, password_hash, role) SELECT full_name, email, password_hash, \\'STUDENT\\' as role FROM json_to_recordset($1) as x(full_name text, email text, password_hash text) ON CONFLICT (email) DO NOTHING RETURNING id, email';
    const userInsertValues = [JSON.stringify(studentsWithPasswords)];
    const { rows: insertedUsers } = await client.query(userInsertQuery, userInsertValues);

    const studentsToInsert = studentsWithPasswords.map(s => {
      const insertedUser = insertedUsers.find(u => u.email === s.email);
      if (insertedUser) {
        s.userId = insertedUser.id;
      }
      return s;
    }).filter(s => s.userId);

    const studentInsertQuery = 'INSERT INTO students (user_id, class_name, school_registration_number, enrollment_id) SELECT user_id, class_name, school_registration_number, enrollment_id FROM json_to_recordset($1) as x(user_id uuid, class_name text, school_registration_number text, enrollment_id text) ON CONFLICT (user_id) DO NOTHING';
    const studentInsertValues = [JSON.stringify(studentsToInsert)];
    await client.query(studentInsertQuery, studentInsertValues);

    await client.query('COMMIT');

    const successfulInserts = studentsToInsert;
    const failedInserts = studentsWithPasswords.filter(s => !successfulInserts.find(si => si.email === s.email));

    const report = {
      successfulImports: successfulInserts.length,
      failedImports: failedInserts.length + errors.length,
      details: {
        success: successfulInserts.map(s => ({ email: s.email, temporaryPassword: s.temporaryPassword })),
        failures: [...errors, ...failedInserts.map(s => ({ email: s.email, error: 'User already exists' }))],
      },
    };

    res.json(report);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during batch import:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router;
