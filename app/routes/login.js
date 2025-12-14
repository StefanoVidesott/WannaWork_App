import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Employee from '../models/Employeer.js'; 
import bcrypt from 'bcryptjs';

const router = express.Router();

router.post('/', async function(req, res) {
    try {
        // 1. Validazione input
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email e password sono richiesti' 
            });
        }

        // 2. Ricerca utente (prima Student, poi Employee)
        let user = await Student.findOne({ email }).select('+password').exec();
        let userType = 'Student';

        if (!user) {
            user = await Employee.findOne({ email }).select('+password').exec();
            userType = 'Employee';
        }

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenziali non valide' // ← Messaggio generico per sicurezza
            });
        }

        if (user) {
    // 🔍 DEBUG: Stampa TUTTO l'oggetto
    console.log('===== DEBUG UTENTE =====');
    console.log('Email:', user.email);
    console.log('ID:', user._id);
   // console.log('Tutte le chiavi:', Object.keys(user.toObject()));
    console.log('Oggetto completo:', JSON.stringify(user, null, 2));
    console.log('user.password:', user.password);
   // console.log('user.passwordHash:', user.passwordHash);
    console.log('========================');
}

        
// 1. Prima controlla che la password esista nel database
if (!user.password) {
    console.error(`Utente ${user.email} non ha una password salvata nel database`);
    return res.status(500).json({ 
        success: false, 
        message: 'Errore di configurazione account. Contatta il supporto.' 
    });
}

// 2. POI confronta la password inserita con quella hashata
const isPasswordValid = await bcrypt.compare(password, user.password);

if (!isPasswordValid) {
    // Questa è una password SBAGLIATA, non un errore di sistema
    return res.status(401).json({ 
        success: false, 
        message: 'Credenziali non valide' 
    });
}

        // 4. Generazione token
        const payload = {
            email: user.email,
            userType: userType,
            id: user._id
        };

        const options = {
            expiresIn: 86400 // 24 ore
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, options);

        // 5. Risposta successo
        res.json({
            success: true,
            message: 'Autenticazione riuscita',
            token: token,
            email: user.email,
            id: user._id,
            userType: userType,
            self: `api/v1/${user._id}`
        });

    } catch(err) {
        console.error('Errore durante l\'autenticazione:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Errore interno del server' 
        });
    }
});

export default router;