const db = require('../config/db');
const crypto = require('crypto');
const { hashPasswordPBKDF2 } = require('../utils/authUtils');

const batchImport = async (req, res) => {
    const { students } = req.body;

    if (!students || !Array.isArray(students)) {
        return res.status(400).json({ error: 'Invalid input. Expected JSON array "students".' });
    }

    const validStudents = [];
    const errors = [];
    const emailsSeen = new Set();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Parse and Validate
    students.forEach((student, index) => {
        const rowNum = index + 1;
        const { fullName, email, grade, registrationNumber } = student;

        if (!fullName || !grade || !registrationNumber) {
            errors.push(`Row ${rowNum}: Missing required fields (fullName, grade, registrationNumber).`);
            return;
        }

        if (email) {
            if (!emailRegex.test(email)) {
                errors.push(`Row ${rowNum}: Invalid email (${email}).`);
                return;
            }
            if (emailsSeen.has(email)) {
                errors.push(`Row ${rowNum}: Duplicate email in batch (${email}).`);
                return;
            }
            emailsSeen.add(email);
        }

        // Generate Credentials
        const tempPassword = crypto.randomBytes(4).toString('hex');
        const passwordHash = hashPasswordPBKDF2(tempPassword);

        validStudents.push({
            fullName,
            email: email || null,
            grade,
            registrationNumber,
            tempPassword,
            passwordHash
        });
    });

    if (validStudents.length === 0) {
        return res.status(400).json({ message: 'No valid students to import.', errors });
    }

    // 2. Batch Insert
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // We can use a loop or construct a bulk insert query.
        // For simplicity and safety against SQL injection, we'll use a loop or jsonb_to_recordset if supported.
        // Let's use the JSONB approach we designed in the SQL file, it's efficient.

        const query = `
      INSERT INTO students (name, email, grade, enrollment_id, marks_balance, password_hash, role)
      SELECT
        s->>'fullName',
        s->>'email',
        s->>'grade',
        s->>'registrationNumber',
        0,
        s->>'passwordHash',
        'STUDENT'
      FROM jsonb_array_elements($1::jsonb) AS s
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email;
    `;

        const result = await client.query(query, [JSON.stringify(validStudents)]);

        await client.query('COMMIT');

        res.json({
            message: 'Batch import processed.',
            totalProcessed: students.length,
            insertedCount: result.rowCount,
            errors,
            // In a real app, we might return the temp passwords securely or email them.
            // For this MVP, we return them to the admin.
            credentials: validStudents.map(s => ({ email: s.email, tempPassword: s.tempPassword }))
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Batch import error:', error);
        res.status(500).json({ error: 'Internal Server Error during batch import.' });
    } finally {
        client.release();
    }
};

module.exports = { batchImport };
