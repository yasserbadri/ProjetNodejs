const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket'); // Assure-toi que ce fichier existe
const authenticateToken = require('../middleware/auth'); // Middleware d'authentification
const User = require('../models/User');

// Créer un ticket
router.post('/api/tickets', authenticateToken, async (req, res) => {
    try {
        const { title, description } = req.body;
        const newTicket = new Ticket({
            title,
            description,
            createdBy: req.user.id
        });
        await newTicket.save();
        res.status(201).json(newTicket);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Récupérer tous les tickets
router.get('/', authenticateToken, async (req, res) => {
    try {
        const tickets = await Ticket.find().populate('createdBy', 'name email');
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mettre à jour un ticket
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { status, assignedTo } = req.body;
        const updatedTicket = await Ticket.findByIdAndUpdate(req.params.id, { status, assignedTo }, { new: true });
        if (!updatedTicket) return res.status(404).json({ message: 'Ticket non trouvé' });
        res.json(updatedTicket);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Supprimer un ticket
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const deletedTicket = await Ticket.findByIdAndDelete(req.params.id);
        if (!deletedTicket) return res.status(404).json({ message: 'Ticket non trouvé' });
        res.json({ message: 'Ticket supprimé' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Attribuer un ticket à un agent de support
router.put('/:id/assign', authenticateToken, async (req, res) => {
    try {
        const { agentId } = req.body; // ID de l'agent de support
        const ticketId = req.params.id; // ID du ticket

        // Vérifier si l'agent existe et a le rôle "agent"
        const agent = await User.findById(agentId);
        if (!agent || agent.role !== 'agent') {
            return res.status(400).json({ message: 'Agent invalide' });
        }

        // Mettre à jour le ticket avec l'agent assigné
        const updatedTicket = await Ticket.findByIdAndUpdate(
            ticketId,
            { assignedTo: agentId, status: 'En cours' }, // Mettre à jour le statut également
            { new: true }
        ).populate('assignedTo', 'name email'); // Récupérer les détails de l'agent

        if (!updatedTicket) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }

        res.json(updatedTicket);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


module.exports = router;
