const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken,isAdmin,isAgentOrAdmin} = require('../middleware/auth'); // Middleware d'authentification


/*// Route d'inscription
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Vérifier si l'utilisateur essaie de créer un agent sans être admin
        if (role === "agent") {
            return res.status(403).json({ message: "Seul un administrateur peut ajouter des agents." });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Utilisateur créé' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});*/
router.post('/register', async (req, res) => {
    try {
        const { name, email, password/*, role*/ } = req.body;

      /*  if (!role) {
            return res.status(400).json({ message: "Le rôle est requis" });
        }
*/
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword/*, role*/ });

        await newUser.save();
        res.status(201).json({ message: 'Utilisateur créé', user: newUser });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Route de connexion
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        console.log(user);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Identifiants incorrects' });
        }
        const token = jwt.sign({ id: user._id }, "test", { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route pour obtenir les informations de l'utilisateur connecté
router.get('/me', authenticateToken,isAgentOrAdmin, async (req, res) => {
    try {
        // Recherche de l'utilisateur dans la base de données par ID
        const user = await User.findById(req.user.id); // On suppose que le JWT contient un `id` de l'utilisateur
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            // Ajoutez d'autres informations selon les besoins
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});



module.exports = router;
