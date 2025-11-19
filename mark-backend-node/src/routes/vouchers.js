const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/redeem', async (req, res) => {
  const { studentId, voucherId, cost } = req.body;

  if (!studentId || !voucherId || !cost) {
    return res.status(400).json({ error: 'studentId, voucherId, and cost are required' });
  }

  try {
    const { rows } = await db.query('SELECT process_redemption($1, $2, $3)', [studentId, voucherId, cost]);
    res.json(rows[0].process_redemption);
  } catch (error) {
    console.error('Error during voucher redemption:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
