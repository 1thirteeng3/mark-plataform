/**
 * GenerateCredentials
 *
 * Responsabilidade:
 *  - Para cada aluno válido, gerar uma senha temporária.
 *  - Gerar o hash dessa senha (PBKDF2).
 *
 * Input: validStudents (do passo anterior)
 * Output: validStudents com password e passwordHash
 */

const crypto = require('crypto');

// Helper function (same as authUtils)
function hashPasswordPBKDF2(password) {
    const salt = crypto.randomBytes(16);
    const iterations = 100000;
    const keylen = 64;
    const digest = 'sha512';

    const derived = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);

    return `pbkdf2$${iterations}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

const validStudents = items[0].json.validStudents || [];

const studentsWithCreds = validStudents.map(student => {
    // Generate random 8-char password
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const passwordHash = hashPasswordPBKDF2(tempPassword);

    return {
        ...student,
        tempPassword,
        passwordHash
    };
});

return [
    {
        json: {
            studentsToInsert: studentsWithCreds
        }
    }
];
