const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket'); // Assure-toi que ce fichier existe
const { authenticateToken,isAdmin,isAgentOrAdmin} = require('../middleware/auth'); // Middleware d'authentification
const User = require('../models/User');

// Créer un ticket
router.post('/api/tickets', authenticateToken,isAgentOrAdmin, async (req, res) => {
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
// Récupérer les tickets selon le rôle de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
    try {
        let query = {};
        
        // Si c'est un utilisateur normal, il ne voit que ses tickets
        if (req.user.role === 'user') {
            query = { createdBy: req.user.id };
        } 
        // Si c'est un agent, il voit ses tickets assignés
        else if (req.user.role === 'agent') {
            query = { assignedTo: req.user.id };
        }
        // Si c'est un admin, il peut voir tous les tickets (pas de filtre)
        
        // Appliquer des filtres supplémentaires si fournis dans la requête
        if (req.query.status === "non_attribue") {
            query.assignedTo = null;
        }

        const tickets = await Ticket.find(query)
            .populate('createdBy', 'name email')
            .populate('assignedTo', 'name email');
            
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Récupérer les tickets d'un utilisateur spécifique
router.get('/user/:userId', authenticateToken, async (req, res) => {
    try {
        // Vérifier si l'utilisateur demande ses propres tickets ou si c'est un admin
        if (req.params.userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Vous n'êtes pas autorisé à voir les tickets d'autres utilisateurs" });
        }
        
        const tickets = await Ticket.find({ createdBy: req.params.userId })
            .populate('createdBy', 'name email')
            .populate('assignedTo', 'name email');
            
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mettre à jour un ticket
router.put('/:id', authenticateToken,isAgentOrAdmin, async (req, res) => {
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
router.delete('/:id', authenticateToken, isAdmin ,async (req, res) => {
    try {
        const deletedTicket = await Ticket.findByIdAndDelete(req.params.id);
        if (!deletedTicket) return res.status(404).json({ message: 'Ticket non trouvé' });
        res.json({ message: 'Ticket supprimé' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Attribuer un ticket à un agent de support
/*router.put('/:id/assign', authenticateToken, async (req, res) => {
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
*/


router.put('/:id/assign', authenticateToken, async (req, res) => {
    try {
        const { agentId } = req.body;
        const ticketId = req.params.id;

        // Vérifier si l'utilisateur est ADMIN
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Seul un administrateur peut assigner des tickets." });
        }

        // Vérifier si l'agent existe et a le rôle "agent"
        const agent = await User.findById(agentId);
        if (!agent || agent.role !== 'agent') {
            return res.status(400).json({ message: 'Agent invalide' });
        }

        // Mettre à jour le ticket avec l'agent assigné
        const updatedTicket = await Ticket.findByIdAndUpdate(
            ticketId,
            { assignedTo: agentId, status: 'En cours' },
            { new: true }
        ).populate('assignedTo', 'name email');

        if (!updatedTicket) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }

        res.json(updatedTicket);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
    
  } );
module.exports = router;


