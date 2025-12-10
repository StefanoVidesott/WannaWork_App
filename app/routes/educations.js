import express from 'express';
import Education from '../models/Education.js';

const router = express.Router();

// GET /api/v1/educations
// Restituisce tutte le università/facoltà
router.get('/', async (req, res) => {
  try {
    const educations = await Education.find().sort('name');
    res.json(educations);
  } catch (error) {
    res.status(500).json({ error: 'Errore server' });
  }
});

// POST /api/v1/educations
// Crea una nuova education
router.post('/', async (req, res) => {
  try {
    const education = new Education(req.body);
    await education.save();
    res.status(201).json(education);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Education già esistente' });
    }
    res.status(500).json({ error: 'Errore creazione education' });
  }
});

export default router;
