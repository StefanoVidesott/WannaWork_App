import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // false per porta 587 (usa STARTTLS), true per porta 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendVerificationEmail = async (userEmail, token) => {
    // URL del tuo backend o frontend
    const verificationUrl = `http://localhost:8080/api/v1/verify-email?token=${token}`;

    const mailOptions = {
        from: `"Support WannaWork App" <${process.env.EMAIL_FROM}>`,
        to: userEmail,
        subject: 'Completa la tua registrazione',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h1>Benvenuto!</h1>
                <p>Grazie per esserti registrato. Per attivare il tuo account, clicca sul pulsante qui sotto:</p>
                <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verifica Email</a>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">Se non hai richiesto questa registrazione, ignora questa email.</p>
                <p style="font-size: 12px; color: #666;">Il link scadrà in 1 ora.</p>
            </div>
        `
    };

    try {
        // Verifica la connessione prima di inviare
        await transporter.verify();

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email inviata: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('Errore invio email con Brevo:', error);
        throw new Error('Impossibile inviare email di verifica');
    }
};