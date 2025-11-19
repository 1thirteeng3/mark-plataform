const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

// Protected route: Only ADMIN can import students
router.post('/batch-import', authenticate, requireRole('ADMIN'), studentController.batchImport);

module.exports = router;
