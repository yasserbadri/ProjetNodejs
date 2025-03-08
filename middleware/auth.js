// middleware/auth.js
/*const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization.split(' ')[1];
    console .log(token);
    if (!token) return res.status(401).json({ message: 'Accès refusé' });
    try {
        const verified = jwt.verify(token, "test");
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: 'Token invalide', error: err.message });
    }
};

module.exports = authenticateToken;*/
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Accès refusé, token manquant' });
    }

    try {
        const decoded = jwt.verify(token, "test");
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        next();
    } catch (error) {
        res.status(401).json({ message: 'Token invalide' });
    }
};
// Middleware pour restreindre aux admins seulement
function isAdmin(req, res, next) {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Accès refusé. Vous devez être administrateur." });
    }
    next();
}

// Middleware pour les agents et admins
function isAgentOrAdmin(req, res, next) {
    if (req.user.role !== "admin" && req.user.role !== "agent") {
        return res.status(403).json({ message: "Accès refusé." });
    }
    next();
}


module.exports = {authenticateToken,isAdmin,isAgentOrAdmin};
