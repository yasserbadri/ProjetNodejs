// routes/user.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');

// Récupérer la liste des agents de support
router.get('/agents', authenticateToken, async (req, res) => {
    try {
        const agents = await User.find({ role: 'agent' }, 'name email'); // Récupérer uniquement les agents
        res.json(agents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;