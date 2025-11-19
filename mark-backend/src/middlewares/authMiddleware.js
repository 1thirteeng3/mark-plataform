const { verifyAndDecodeJWT } = require('../utils/authUtils');

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const secretV1 = process.env.JWT_SECRET_V1;
        const secretV2 = process.env.JWT_SECRET_V2;

        if (!secretV1) {
            console.error('JWT_SECRET_V1 not defined');
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        const payload = verifyAndDecodeJWT(authHeader, secretV1, secretV2);
        req.user = payload;
        next();
    } catch (error) {
        if (error.message === 'TOKEN_MISSING') return res.status(401).json({ error: 'Token missing' });
        if (error.message === 'TOKEN_EXPIRED') return res.status(401).json({ error: 'Token expired' });
        return res.status(403).json({ error: 'Invalid token' });
    }
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

module.exports = { authenticate, requireRole };
