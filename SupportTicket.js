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
const sendEmail = require('./utils/emailService');

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
         // Récupération des informations de l'utilisateur ayant créé le ticket
         const user = await User.findById(req.user.id);

         // Envoi de l'email de notification
         await sendEmail(
             user.email, // Email de l'utilisateur ayant créé le ticket
             "Ticket créé avec succès",
             `Bonjour ${user.name},\n\nVotre ticket a été créé avec succès !\n\nTitre: ${newTicket.title}\nDescription: ${newTicket.description}\n\nMerci,\nL'équipe Support.`
         );
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


app.post("/api/tickets/:id/assign", authenticateToken, isAdmin, async (req, res) => {
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

        // Assignation de l'agent au ticket
        ticket.assignedTo = agentId;
        ticket.status = "En cours"; // Optionnel, si tu veux changer le statut du ticket lors de l'assignation
        await ticket.save();

       

        res.json({ message: "Ticket assigné et notification envoyée" });
    } catch (err) {
        res.status(500).json({ message: "Erreur lors de l'assignation du ticket" });
    }
});

// Mise à jour d'un ticket
app.put('/api/tickets/:id', authenticateToken, isAgentOrAdmin, async (req, res) => {
    try {
        const { status, assignedTo } = req.body;

        console.log("Données reçues pour mise à jour :", req.body); // 🔍 Étape 1 : Log des données reçues

        // Vérifier si l'ID du ticket est valide
        console.log("ID du ticket à mettre à jour :", req.params.id);
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "ID du ticket invalide" });
        }

        // Vérifier si le ticket existe avant la mise à jour
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ message: "Ticket non trouvé" });
        }
        console.log("Ticket trouvé :", ticket); // 🔍 Étape 2 : Log du ticket trouvé

        // Mise à jour des champs
        if (status) ticket.status = status;
        if (assignedTo) ticket.assignedTo = assignedTo;

        console.log("Mise à jour en cours :", ticket); // 🔍 Étape 3 : Avant l'enregistrement

        await ticket.save(); // Sauvegarde de la mise à jour

        console.log("Ticket mis à jour avec succès :", ticket); // 🔍 Étape 4 : Log du succès
        res.json(ticket);
    } catch (err) {
        console.error("❌ Erreur lors de la mise à jour du ticket :", err);
        res.status(500).json({ message: "Erreur serveur lors de la mise à jour du ticket" });
    }
});

/*app.put('/api/tickets/:id', authenticateToken, isAgentOrAdmin,async (req, res) => {
    try {
        console.log("Données reçues pour mise à jour :", req.body); // 🔍 Debug

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
*/
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

    try {
        // Récupération de l'agent
        const agent = await User.findById(agentId);
        if (!agent) {
            return res.status(404).json({ message: "Agent non trouvé" });
        }

        console.log("Agent trouvé :", agent); // Pour vérifier la récupération de l'agent

        // Assigner l'agent au ticket
        ticket.agent = agentId;
        await ticket.save();

        // Vérification que l'email de l'agent est disponible
        if (!agent.email) {
            return res.status(400).json({ message: "L'agent n'a pas d'email valide" });
        }

        // Envoi de l'email
        await sendEmail(
            agent.email, // Email de l'agent
            "Nouveau ticket assigné",
            `Bonjour ${agent.name},\n\nUn nouveau ticket vous a été assigné.\n\nTitre: ${ticket.title}\nDescription: ${ticket.description}\n\nMerci,\nL'équipe Support.`
        );
        console.log("✅ E-mail envoyé !");

        // Retourner une réponse positive
        res.json({ message: "Ticket attribué avec succès et notification envoyée", ticket });
    } catch (error) {
        console.error("Erreur lors de l'assignation du ticket ou de l'envoi de l'email :", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// Récupérer les tickets assignés à l'utilisateur connecté
app.get('/api/tickets/assigned', authenticateToken, isAgentOrAdmin, async (req, res) => {
    try {
        const userId = req.user.id;  // Récupère l'id de l'utilisateur connecté
        console.log("Utilisateur connecté:", userId);

        const tickets = await Ticket.find({ assignedTo: userId }).populate('createdBy', 'name email');
        console.log("Tickets assignés:", tickets);  // Affichage des tickets récupérés


        if (!tickets.length) {
            return res.status(404).json({ message: 'Aucun ticket assigné trouvé.' });
        }

        res.json(tickets);
    } catch (err) {
        console.error('Erreur lors de la récupération des tickets assignés:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});



// Mise à jour du statut d'un ticket (accessible par agent ou admin)
app.put('/api/tickets/:id/status', authenticateToken, isAgentOrAdmin, async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'Le statut est requis.' });
        }

        // Vérifier si le statut est valide (par exemple: Ouvert, En cours, Fermé)
        const validStatuses = ['Ouvert', 'En cours', 'Fermé'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Statut invalide. Choisissez parmi "Ouvert", "En cours" ou "Fermé".' });
        }

        // Recherche du ticket à mettre à jour
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket non trouvé' });
        }

        // Mise à jour du statut
        ticket.status = status;
        await ticket.save();

        // Envoi d'une notification par email si le statut change
        const user = await User.findById(ticket.createdBy);
        if (user) {
            await sendEmail(user.email, 'Mise à jour du statut du ticket',
                `Le statut de votre ticket "${ticket.title}" a été mis à jour à : ${status}.`);
        }

        res.json({ message: 'Statut du ticket mis à jour avec succès', ticket });
    } catch (err) {
        console.error('Erreur lors de la mise à jour du statut du ticket:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
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
