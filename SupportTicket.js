// Import des modules
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const nodemailer = require('nodemailer');
const User = require('./models/User');
const Ticket = require('./models/Ticket');
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/ticket');
const userRoutes = require('./routes/user');
const {authenticateToken,isAdmin,isAgentOrAdmin} = require('./middleware/auth'); // Middleware d'authentification

// Configuration
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Servir les fichiers statiques

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connecté'))
  .catch(err => console.error('Erreur de connexion MongoDB:', err));

// Configuration du transporteur d'e-mails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Fonction d'envoi d'e-mail
const sendEmailNotification = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text
        });
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'e-mail:', error);
    }
};

// Tableau de bord
app.get('/api/dashboard', authenticateToken,isAdmin, async (req, res) => {
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

// Routes des tickets
app.post('/api/tickets', authenticateToken,isAgentOrAdmin, async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title || !description) {
            return res.status(400).json({ message: 'Titre et description requis' });
        }

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

// Récupération des tickets avec option de filtrage
app.get('/api/tickets', authenticateToken, isAgentOrAdmin,async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        if (status === "non_attribue") {
            query.agent = null;
        }

        const tickets = await Ticket.find(query).populate('createdBy', 'name email');
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la récupération des tickets' });
    }
});

// Assignation d'un ticket à un agent
app.post("/api/tickets/:id/assign", authenticateToken,isAdmin, async (req, res) => {
    console.log("ID du ticket reçu :", req.params.id); // Ajout pour debug

    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Accès interdit" });
    }

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "ID de ticket invalide" });
        }
        const { agentId } = req.body;
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ message: "Ticket non trouvé" });
        }

        const agent = await User.findById(agentId);
        if (!agent) {
            return res.status(404).json({ message: "Agent non trouvé" });
        }
console.log("ID de l'agent reçu :", agentId); // Ajout pour debug
        ticket.agent = agentId;
        await ticket.save();

        // Envoi d'un email à l'agent
        await sendEmailNotification(agent.email, "Nouveau ticket assigné",
            `Bonjour ${agent.name},\nUn nouveau ticket vous a été assigné : ${ticket.title}`);

        res.json({ message: "Ticket assigné et notification envoyée" });
    } catch (err) {
        res.status(500).json({ message: "Erreur lors de l'assignation du ticket" });
    }
});

// Mise à jour d'un ticket
app.put('/api/tickets/:id', authenticateToken, isAgentOrAdmin,async (req, res) => {
    try {
        const { status, assignedTo } = req.body;

        const updatedTicket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { status, assignedTo },
            { new: true }
        );

        if (!updatedTicket) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }

        // Notification par e-mail en cas de mise à jour du statut
        if (status) {
            const user = await User.findById(updatedTicket.createdBy);
            if (user) {
                await sendEmailNotification(user.email, 'Mise à jour du ticket',
                    `Le statut de votre ticket "${updatedTicket.title}" a été mis à jour à : ${status}.`);
            }
        }

        res.json(updatedTicket);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Suppression d'un ticket
app.delete('/api/tickets/:id', authenticateToken,isAgentOrAdmin, async (req, res) => {
    try {
        const deletedTicket = await Ticket.findByIdAndDelete(req.params.id);
        if (!deletedTicket) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }
        res.json({ message: 'Ticket supprimé' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
app.put("/api/tickets/:id/assign", authenticateToken, async (req, res) => {
    console.log("ID reçu :", req.params.id); // Ajoute ceci pour voir l'ID reçu

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "ID du ticket invalide" });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
        return res.status(404).json({ message: "Ticket non trouvé" });
    }

    const { agentId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
        return res.status(400).json({ message: "ID de l'agent invalide" });
    }

    ticket.agent = agentId;
    await ticket.save();
    res.json({ message: "Ticket attribué avec succès", ticket });
});
// Exemple avec Express et MongoDB
app.get('/api/tickets/user/:userId', async (req, res) => {
    try {
        const tickets = await Ticket.find({ createdBy: req.params.userId });
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', authenticateToken, isAgentOrAdmin,ticketRoutes);
app.use('/api/users', userRoutes);
const dashboardRoutes = require('./routes/dashboard');

app.use('/api', dashboardRoutes);

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
