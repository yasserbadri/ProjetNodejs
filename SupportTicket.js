// Import des modules
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const fetch = require('node-fetch');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/ticket');
const userRoutes = require('./routes/user');
const dashboardRoutes = require('./routes/dashboard');
const { authenticateToken, isAdmin, isAgentOrAdmin } = require('./middleware/auth');

// Configuration
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connecté'))
  .catch(err => console.error('Erreur de connexion MongoDB:', err));

// Fonction d'envoi de notification par e-mail avec EmailJS
async function sendEmailNotification(to_email, to_name, ticket) {
    try {
        const url = 'https://api.emailjs.com/api/v1.0/email/send';
        const data = {
            service_id: process.env.EMAILJS_SERVICE_ID,
            template_id: process.env.EMAILJS_TEMPLATE_ID,
            user_id: process.env.EMAILJS_PUBLIC_KEY,
            accessToken: process.env.EMAILJS_PRIVATE_KEY,
            template_params: {
                to_name: to_name,
                from_name: 'Support System',
                ticket_title: ticket.title,
                ticket_description: ticket.description,
                ticket_status: ticket.status,
                ticket_id: ticket._id,
                to_email: to_email,
                reply_to: 'support@example.com'
            }
        };

        console.log('Sending email notification to:', to_email);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const responseText = await response.text();
            console.log('Email sent successfully. Response:', responseText);
            return true;
        } else {
            const errorText = await response.text();
            console.error('Failed to send email:', response.status, errorText);
            return false;
        }
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// Tableau de bord
app.get('/api/dashboard', authenticateToken, isAdmin, async (req, res) => {
    try {
        const totalTickets = await Ticket.countDocuments();
        const openTickets = await Ticket.countDocuments({ status: 'Ouvert' });
        const inProgressTickets = await Ticket.countDocuments({ status: 'En cours' });
        const closedTickets = await Ticket.countDocuments({ status: 'Fermé' });
        res.json({ totalTickets, openTickets, inProgressTickets, closedTickets });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Création de ticket
app.post('/api/tickets', authenticateToken, isAgentOrAdmin, async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title || !description) {
            return res.status(400).json({ message: 'Titre et description requis' });
        }
        const newTicket = new Ticket({ title, description, createdBy: req.user.id });
        await newTicket.save();
        res.status(201).json(newTicket);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Récupération des tickets avec option de filtrage
app.get('/api/tickets', authenticateToken, async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        
        // Filtrer les tickets selon le rôle de l'utilisateur
        if (req.user.role === 'user') {
            query.createdBy = req.user.id;
        } else if (req.user.role === 'agent') {
            query.assignedTo = req.user.id;
        }
        // Les admins peuvent voir tous les tickets
        
        // Appliquer des filtres supplémentaires
        if (status === "non_attribue") {
            query.assignedTo = null;
        }
        
        const tickets = await Ticket.find(query)
            .populate('createdBy', 'name email')
            .populate('assignedTo', 'name email');
            
        res.json(tickets);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la récupération des tickets' });
    }
});

// Assignation d'un ticket à un agent
app.put('/api/tickets/:id/assign', authenticateToken, isAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "ID de ticket invalide" });
        }
        
        const { agentId } = req.body;
        
        // Vérifier si l'agent existe et a le rôle "agent"
        const agent = await User.findById(agentId);
        if (!agent || agent.role !== 'agent') {
            return res.status(400).json({ message: 'Agent invalide' });
        }
        
        // Mettre à jour le ticket avec l'agent assigné
        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { assignedTo: agentId, status: 'En cours' },
            { new: true }
        );
        
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }

        // Envoyer une notification par email à l'agent
        try {
            await sendEmailNotification(agent.email, agent.name, ticket);
            console.log(`Notification envoyée à ${agent.email}`);
            res.json({ 
                message: "Ticket assigné et notification envoyée", 
                ticket 
            });
        } catch (emailError) {
            console.error("Erreur d'envoi d'email:", emailError);
            res.json({ 
                message: "Ticket assigné mais échec de notification", 
                ticket, 
                emailError: emailError.message 
            });
        }
    } catch (err) {
        console.error("Erreur d'assignation:", err);
        res.status(500).json({ message: "Erreur lors de l'assignation du ticket", error: err.message });
    }
});

// Suppression d'un ticket
app.delete('/api/tickets/:id', authenticateToken, isAgentOrAdmin, async (req, res) => {
    try {
        const deletedTicket = await Ticket.findByIdAndDelete(req.params.id);
        if (!deletedTicket) return res.status(404).json({ message: 'Ticket non trouvé' });
        res.json({ message: 'Ticket supprimé' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Test d'envoi d'email
app.post('/api/test-email', authenticateToken, isAdmin, async (req, res) => {
    try {
        await sendEmailNotification(req.body.testEmail, "Test User", { title: "Test", description: "Ceci est un test", status: "Test", _id: "12345" });
        res.json({ message: "Email de test envoyé avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Échec de l'envoi de l'email de test", error: error.message });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', authenticateToken, isAgentOrAdmin, ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api', dashboardRoutes);

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));