const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');

const { getDashboardStats } = require('../controllers/dashboard');

router.get('/dashboard', authenticateToken, isAdmin, getDashboardStats);

module.exports = router;
