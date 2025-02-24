// middleware/auth.js
const jwt = require('jsonwebtoken');

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

module.exports = authenticateToken;