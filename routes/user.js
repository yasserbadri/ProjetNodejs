// routes/user.js
const express = require('express');
const router = express.Router();
const {authenticateToken,isAdmin} = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');  // ✅ Ajout de bcrypt


// Récupérer la liste des agents de support
router.get('/agents', authenticateToken,isAdmin, async (req, res) => {
    try {
        const agents = await User.find({ role: 'agent' }, '_id name email'); // Récupérer uniquement les agents
        res.json(agents);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.post('/add-agent', authenticateToken,isAdmin, async (req, res) => {
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

// 🔹 Voir tous les utilisateurs (ADMIN uniquement)
router.get('/all-users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '_id name email role'); // Sélectionner les infos essentielles
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Modifier le rôle d'un utilisateur (ADMIN uniquement)
router.put('/update-role/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        if (!['admin', 'agent', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Rôle invalide' });
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });

        if (!updatedUser) return res.status(404).json({ message: 'Utilisateur non trouvé' });

        res.json({ message: 'Rôle mis à jour', user: updatedUser });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Supprimer un utilisateur (ADMIN uniquement)
router.delete('/delete-user/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);

        if (!deletedUser) return res.status(404).json({ message: 'Utilisateur non trouvé' });

        res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



module.exports = router;

