// routes/user.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');  // ✅ Ajout de bcrypt


// Récupérer la liste des agents de support
router.get('/agents', authenticateToken, async (req, res) => {
    try {
        const agents = await User.find({ role: 'agent' }, '_id name email'); // Récupérer uniquement les agents
        res.json(agents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.post('/add-agent', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Seul un administrateur peut ajouter des agents' });
        }

        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newAgent = new User({ name, email, password: hashedPassword, role: 'agent' });

        await newAgent.save();
        res.status(201).json({ message: 'Agent ajouté avec succès', agent: newAgent });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});




module.exports = router;

