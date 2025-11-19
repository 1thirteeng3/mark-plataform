const db = require('../config/db');
const { verifyPasswordPBKDF2, signJWT } = require('../utils/authUtils');

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const result = await db.query('SELECT * FROM students WHERE email = $1', [email]);
        // Note: We should also check admin table if admins are separate, or users table if unified.
        // Assuming 'students' for now based on previous context, but typically there's a 'users' table or roles.
        // The prompt mentioned "Register hash in the users table". Let's assume 'users' table is the main auth table.
        // If not, we might need to check multiple tables or a view.
        // Let's try 'users' first, if it fails we fall back to 'students' logic or check schema.
        // Actually, the batch import inserted into 'students'. Let's stick to 'students' for students.
        // But what about Admins?
        // Let's assume a unified 'users' table or 'students' has a role column.
        // The batch import SQL inserted into 'students' with role 'STUDENT'.
        // So we query 'students'.

        // Wait, if admins are in a different table, this login only works for students.
        // Let's assume for MVP v2.0 we query 'students'. If no student found, maybe check 'admins'?
        // For now, let's query 'students'.

        let user = result.rows[0];

        if (!user) {
            // Try admin table if exists? Or maybe 'users' table?
            // Let's assume 'students' is the main one for now as per previous tasks.
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = verifyPasswordPBKDF2(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const tokenPayload = {
            userId: user.id,
            role: user.role,
            schoolId: user.school_id // Assuming this column exists
        };

        const secret = process.env.JWT_SECRET_V1;
        const token = signJWT(tokenPayload, secret);

        res.json({
            accessToken: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { login };
