const db = require('../config/db');

const redeemVoucher = async (req, res) => {
    const { voucherId, cost } = req.body;
    const studentId = req.user.userId; // From auth middleware

    if (!voucherId || !cost) {
        return res.status(400).json({ error: 'Missing voucherId or cost.' });
    }

    try {
        // Call Stored Procedure
        // process_redemption(p_student_id UUID, p_voucher_id UUID, p_cost INT)
        const query = 'SELECT process_redemption($1, $2, $3) as result';
        const values = [studentId, voucherId, cost];

        const { rows } = await db.query(query, values);
        const result = rows[0].result;

        if (result.status === 'SUCCESS') {
            res.json(result);
        } else {
            // Could be insufficient balance or other error caught by SP
            res.status(400).json(result);
        }

    } catch (error) {
        console.error('Redemption error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { redeemVoucher };
