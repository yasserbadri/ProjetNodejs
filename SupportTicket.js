// Import des modules
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('./models/User');
const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/ticket');
const authenticateToken = require('./middleware/auth'); // Import the middleware
const Ticket = require('./models/Ticket'); // Importez le modèle Ticket
const userRoutes = require('./routes/user'); // Importer les routes utilisateur


// Configuration
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB connecté'))
  .catch(err => console.error(err));

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
        console.error('Erreur lors de lenvoi de le-mail', error);
    }
};

// Tableau de bord
app.get('/api/dashboard', authenticateToken, async (req, res) => {
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
app.post('/api/tickets', authenticateToken , async (req, res) => {
    try {
        const { title, description } = req.body;
        const newTicket = new Ticket({
            title,
            description,
            createdBy: req.user.id
        });
        await newTicket.save();
        /*
        // Notification par e-mail
        const user = await User.findById(req.user.id);
        if (user) {
            sendEmailNotification(user.email, 'Nouveau ticket créé', `Votre ticket "${title}" a été créé avec succès.`);
        }
        */
        res.status(201).json(newTicket);
        
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/tickets', authenticateToken, async (req, res) => {
    try {
        const tickets = await Ticket.find().populate('createdBy', 'name email');
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/tickets/:id', authenticateToken, async (req, res) => {
    try {
        const { status, assignedTo } = req.body;
        const updatedTicket = await Ticket.findByIdAndUpdate(req.params.id, { status, assignedTo }, { new: true });
        if (!updatedTicket) return res.status(404).json({ message: 'Ticket non trouvé' });
        
        // Notification par e-mail en cas de mise à jour du statut
        if (status) {
            const user = await User.findById(updatedTicket.createdBy);
            if (user) {
                sendEmailNotification(user.email, 'Mise à jour du ticket', `Le statut de votre ticket "${updatedTicket.title}" a été mis à jour à : ${status}.`);
            }
        }
        
        res.json(updatedTicket);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/tickets/:id', authenticateToken, async (req, res) => {
    try {
        const deletedTicket = await Ticket.findByIdAndDelete(req.params.id);
        if (!deletedTicket) return res.status(404).json({ message: 'Ticket non trouvé' });
        res.json({ message: 'Ticket supprimé' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', authenticateToken, ticketRoutes);
app.use('/api/users', userRoutes); // Ajouter les routes utilisateur

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));


app.use(express.static('public'));
