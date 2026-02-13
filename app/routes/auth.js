import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import Student from '../models/Student.js';
import Employer from '../models/Employer.js';

const router = express.Router();

router.post('/login', async function (req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email e password sono richiesti' });
        }

        let user = await Student.findOne({ email }).select('+password').exec();
        let userType = 'Student';

        if (!user) {
            user = await Employer.findOne({ email }).select('+password').exec();
            userType = 'Employer';
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email non trovata'
            });
        }

        if (user.isVerified === false) {
            return res.status(403).json({
                success: false,
                message: 'Account non verificato. Controlla la tua email'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Password errata'
            });
        }

        const payload = {
            email: user.email,
            userType: userType,
            id: user._id
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            message: 'Autenticazione riuscita',
            token: token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name || user.companyName,
                userType: userType
            }
        });

        console.log("token generato:", token);

    } catch(err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

// GET /api/v1/auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ success: false, message: 'Token mancante' });
        }

        const decoded = jwt.verify(token, process.env.EMAIL_SECRET);

        let user = await Student.findById(decoded.id);
        if (!user) {
            user = await Employer.findById(decoded.id);
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utente non trovato' });
        }

        if (user.isVerified) {
            return res.status(200).json({ success: true, message: 'Email già verificata. Puoi effettuare il login.' });
        }

        user.isVerified = true;
        await user.save();

        return res.status(200).json({ success: true, message: 'Email verificata con successo!' });

    } catch (error) {
        console.error('Errore verifica email:', error);
        return res.status(400).json({ success: false, message: 'Link di verifica non valido o scaduto.' });
    }
});

export default router;
