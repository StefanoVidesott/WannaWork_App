import express from 'express';
import Employer from '../models/Employer.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import validateEmployerRegistration from '../middleware/validEmployersRegistration.js';
import { sendVerificationEmail } from '../utils/emailService.js';

const router = express.Router();

// POST /api/v1/employers/registration
router.post('/registration', validateEmployerRegistration, async (req, res) => {
    try {
        const { companyName, email, headquarters, website, password, privacy } = req.body;

        const existingEmployer = await Employer.findOne({ email: email.toLowerCase() });

        if (existingEmployer) {
            return res.status(409).json({ success: false, message: 'Questa email aziendale è già registrata' });
        }

        const saltrounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltrounds);

        const newEmployer = new Employer({
            companyName: companyName.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            headquarters: headquarters.trim(),
            website: website ? website.trim() : undefined,
            privacy: privacy,
            isVerified: false
        });

        await newEmployer.save();

        const emailToken = jwt.sign(
            { id: newEmployer._id },
            process.env.EMAIL_SECRET,
            { expiresIn: '24h' }
        );

        try {
            await sendVerificationEmail(newEmployer.email, emailToken);
        } catch (emailError) {
            console.error('Fallito invio mail:', emailError);
        }

        return res.status(201).json({
            success: true,
            message: 'Registrazione avvenuta con successo',
            redirect_url: '/login'
        });
    }
    catch (error) {
        console.error('Errore durante la registrazione:', error);

        if (error.name === 'ValidationError') {
             return res.status(400).json({ success: false, message: 'Dati non validi', error: error.message });
        }

        return res.status(500).json({ success: false, message: 'Errore del server durante la registrazione' });
    }
});

export default router;
