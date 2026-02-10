import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Employee from '../models/Employeer.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.post('/', async function (req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email e password sono richiesti' });
        }

        let user = await Student.findOne({ email }).select('+password').exec();
        let userType = 'Student';

        if (!user) {
            user = await Employee.findOne({ email }).select('+password').exec();
            userType = 'Employee';
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

    } catch(err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

export default router;