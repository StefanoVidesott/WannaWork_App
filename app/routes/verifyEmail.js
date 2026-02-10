import express from 'express';
import Student from '../models/Student.js';
import Employeer from '../models/Employeer.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// GET /api/v1/verify-email?token=...
router.get('/', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token mancante' });
        }

        const decoded = jwt.verify(token, process.env.EMAIL_SECRET);

        const user = await Student.findById(decoded.id);
        if (!user) {
            user = await Employeer.findById(decoded.id);
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utente non trovato' });
        }

        if (user.isVerified) {
            return res.status(200).json({ success: true, message: 'Email già verificata. Puoi effettuare il login.' });
        }

        user.isVerified = true;
        await user.save();

        // TODO redirect to login page (es. return res.redirect('http://localhost:5173/login?verified=true');)
        return res.status(200).json({ success: true, message: 'Email verificata con successo!' });

    } catch (error) {
        console.error('Errore verifica email:', error);
        return res.status(400).json({ success: false, message: 'Link di verifica non valido o scaduto.' });
    }
});

export default router;
