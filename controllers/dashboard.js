const Ticket = require('../models/Ticket'); // Assure-toi que ton modèle Ticket est bien défini
// Fonction pour récupérer les statistiques du tableau de bord
exports.getDashboardStats = async (req, res) => {
    try {
        const totalTickets = await Ticket.countDocuments(); // Nombre total de tickets
        const open = await Ticket.countDocuments({ status: 'Ouvert' });
        const inProgress = await Ticket.countDocuments({ status: 'En cours' });
        const resolved = await Ticket.countDocuments({ status: 'Résolu' });

        // Tickets par agent
        const agentStats = await Ticket.aggregate([
            { $match: { assignedTo: { $ne: null } } }, // Exclure les tickets non assignés
            { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "agent" } },
            { $unwind: "$agent" },
            { $project: { _id: 0, name: "$agent.name", tickets: "$count" } }
        ]);

        res.json({
            totalTickets,
            open,
            inProgress,
            resolved,
            agents: agentStats
        });

    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des statistiques", error });
    }
};
