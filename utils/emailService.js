const nodemailer = require('nodemailer');
require('dotenv').config(); // 👈 Charge les variables d'environnement


console.log("Le service d'email est chargé !");

console.log("📩 Le service d'email est chargé !");
console.log("📌 MAIL_HOST:", process.env.MAIL_HOST);
console.log("📌 MAIL_PORT:", process.env.MAIL_PORT);
console.log("📌 MAIL_USER:", process.env.MAIL_USER);
console.log("📌 MAIL_PASS:", process.env.MAIL_PASS);

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});


async function sendEmail(to, subject, text) {
    const mailOptions = {
        from: '"Support Tickets" <no-reply@example.com>',
        to,
        subject,
        text
    };

    try {
        console.log("Tentative d'envoi d'email à :", to);
        await transporter.sendMail(mailOptions);
        console.log("E-mail envoyé avec succès à :", to);
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'e-mail :", error);
    }
}

module.exports = sendEmail;
