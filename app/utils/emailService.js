import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const generateTemplate = (content, title) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            .body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f6; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 8px; border-collapse: separate; overflow: hidden; margin-top: 20px; border: 1px solid #e1e4e8; }
            .header { background-color: #2d3436; padding: 30px; text-align: center; color: #ffffff; }
            .content { padding: 40px 30px; line-height: 1.6; color: #2d3436; font-size: 16px; }
            .footer { padding: 20px; text-align: center; color: #636e72; font-size: 12px; }
            .button { background-color: #0984e3; border-radius: 4px; color: #ffffff !important; display: inline-block; font-weight: bold; padding: 12px 24px; text-decoration: none; margin-top: 20px; }
            .accent { color: #0984e3; font-weight: bold; }
            h1 { margin-top: 0; color: #ffffff; font-size: 24px; }
            h2 { margin-top: 0; color: #2d3436; font-size: 20px; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <table class="main">
                <tr>
                    <td class="header">
                        <h1>WannaWork</h1>
                    </td>
                </tr>
                <tr>
                    <td class="content">
                        ${content}
                    </td>
                </tr>
            </table>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} WannaWork App. Tutti i diritti riservati.</p>
                <p>Trento, Italia</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

const executeMailSend = async (mailOptions) => {
    if (process.env.NODE_ENV === 'test') {
        console.log(`[TEST MODE] Email non inviata a: ${mailOptions.to} (Oggetto: ${mailOptions.subject})`);
        return true;
    }
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email inviata: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Errore invio email:', error);
        return false;
    }
};

export const sendVerificationEmail = async (userEmail, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080/api/v1/auth'}/verify-email?token=${token}`;
    const content = `
        <h2>Benvenuto su WannaWork!</h2>
        <p>Siamo felici di averti con noi. Per iniziare a esplorare le opportunità lavorative o pubblicare le tue offerte, dobbiamo prima verificare la tua identità.</p>
        <p>Clicca sul pulsante qui sotto per attivare il tuo account:</p>
        <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verifica il mio account</a>
        </div>
        <p style="margin-top: 30px; font-size: 14px; color: #636e72;">Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>${verificationUrl}</p>
    `;

    return await executeMailSend({
        from: `"Supporto WannaWork" <${process.env.EMAIL_FROM}>`,
        to: userEmail,
        subject: '🚀 Attiva il tuo account WannaWork',
        html: generateTemplate(content)
    });
};

export const sendOfferUpdatedNotification = async (userEmail, jobTitle) => {
    const content = `
        <h2>Aggiornamento Offerta</h2>
        <p>Ti informiamo che l'offerta per la posizione <span class="accent">${jobTitle}</span>, per cui hai mostrato interesse, è stata aggiornata dal datore di lavoro.</p>
        <p>Ti invitiamo a controllare i dettagli sulla piattaforma per verificare eventuali modifiche a orari, requisiti o compenso.</p>
    `;
    return await executeMailSend({
        from: `"WannaWork Alerts" <${process.env.EMAIL_FROM}>`,
        to: userEmail,
        subject: `📝 Modifica all'offerta: ${jobTitle}`,
        html: generateTemplate(content)
    });
};

export const sendProfileDeletedWithdrawalNotification = async (employerEmail, jobTitle, studentName) => {
    const content = `
        <h2>Candidatura non più disponibile</h2>
        <p>Ti informiamo che lo studente <span class="accent">${studentName}</span> ha rimosso il suo profilo di disponibilità.</p>
        <p>Di conseguenza, la sua candidatura per la posizione <span class="accent">${jobTitle}</span> è stata ritirata automaticamente dal sistema.</p>
    `;
    return await executeMailSend({
        from: `"WannaWork Notifiche" <${process.env.EMAIL_FROM}>`,
        to: employerEmail,
        subject: `⚠️ Ritiro profilo: ${studentName}`,
        html: generateTemplate(content)
    });
};

export const sendOfferDeletedNotification = async (userEmail, jobTitle, reason) => {
    const content = `
        <h2>Offerta Archiviata</h2>
        <p>L'offerta per <span class="accent">${jobTitle}</span> non è più disponibile sulla piattaforma.</p>
        <p><strong>Messaggio del datore di lavoro:</strong><br><em>"${reason}"</em></p>
        <p>Non preoccuparti, ci sono molte altre opportunità che ti aspettano!</p>
    `;
    return await executeMailSend({
        from: `"WannaWork Alerts" <${process.env.EMAIL_FROM}>`,
        to: userEmail,
        subject: `❌ Offerta chiusa: ${jobTitle}`,
        html: generateTemplate(content)
    });
};

export const sendNewApplicationNotification = async (employerEmail, jobTitle, studentName) => {
    const content = `
        <h2>Nuova Candidatura Ricevuta!</h2>
        <p>Ottime notizie! Lo studente <span class="accent">${studentName}</span> si è appena candidato per la tua offerta: <strong>${jobTitle}</strong>.</p>
        <p>Accedi alla tua area riservata per visualizzare il suo profilo, le competenze e i contatti.</p>
        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/employer" class="button">Visualizza Candidati</a>
        </div>
    `;
    return await executeMailSend({
        from: `"WannaWork Notifiche" <${process.env.EMAIL_FROM}>`,
        to: employerEmail,
        subject: `✨ Nuova candidatura per ${jobTitle}`,
        html: generateTemplate(content)
    });
};

export const sendApplicationWithdrawnNotification = async (employerEmail, jobTitle, studentName) => {
    const content = `
        <h2>Ritiro della Candidatura</h2>
        <p>Ti informiamo che lo studente <span class="accent">${studentName}</span> ha deciso di ritirare manualmente la sua candidatura per la posizione: <strong>${jobTitle}</strong>.</p>
        <p>Il profilo dello studente non apparirà più tra i candidati attivi per questa specifica offerta.</p>
    `;
    return await executeMailSend({
        from: `"WannaWork Notifiche" <${process.env.EMAIL_FROM}>`,
        to: employerEmail,
        subject: `↩️ Candidatura ritirata da ${studentName}`,
        html: generateTemplate(content)
    });
};
