const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

// Protected route: STUDENT only
router.post('/redeem', authenticate, requireRole('STUDENT'), voucherController.redeemVoucher);

module.exports = router;
