import express from 'express';
import Employee from '../models/Employeer.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import validateEmployerRegistration from '../middleware/ValidEmployeeRegistration.js';

const router = express.Router();

// Mancano la conferma di indirizzo email e i logging

router.post('/registration', validateEmployerRegistration, async (req, res) => {
  try {
    const { companyName, email, password, headquarters, website } = req.body;

     // 1. Verificare se email + azienda + sede già registrata
    const existingEmployer = await Employee.findOne({
      email: email.toLowerCase(),
      companyName: companyName.trim(),
      headquarters: headquarters.trim()
    });

    if (existingEmployer) {
        return res.status(409).json({ success: false, message: 'Questa combinazione di email, nome azienda e sede principale è già registrata' });
    }

    const saltrounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltrounds);

    const newEmployer = new Employee({
      companyName: companyName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      headquarters: headquarters.trim(),
      website: website ? website.trim() : undefined
    });

    await newEmployer.save();

    return res.status(201).json({ 
      success: true, 
      message: 'Registrazione avvenuta con successo',
      redirect_url: '/login' });
  }
   catch (error) {

    // Spazio per log errori

    console.error('Errore durante la registrazione:', error);
   return res.status(500).json({ success: false, message: 'Errore del server durante la registrazione' });
  }});

export default router;