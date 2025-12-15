import express from 'express';
import Education from '../models/Education.js';

const router = express.Router();

// GET /api/v1/educations/
router.get('/', async (req, res) => {
    try {
        // Recupera tutti, ordinati alfabeticamente per nome (A-Z)
        // Selezioniamo solo _id, name e university per mantenere il payload leggero
        const educationList = await Education.find()
            .select('name university')
            .sort({ name: 1 });

        return res.status(200).json({
            success: true,
            count: educationList.length,
            data: educationList
        });

    } catch (error) {
        console.error('Errore recupero Education:', error);
        return res.status(500).json({
            success: false,
            message: 'Errore del server durante il recupero degli istituti'
        });
    }
});

export default router;