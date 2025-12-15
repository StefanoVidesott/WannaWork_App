import express from 'express';
import Skill from '../models/Skill.js';

const router = express.Router();

// GET /api/v1/skills/
router.get('/', async (req, res) => {
    try {
        // Recupera tutti, ordinati alfabeticamente per nome (A-Z)
        // Selezioniamo solo _id, name e type per mantenere il payload leggero
        const skillList = await Skill.find()
            .select('name type')
            .sort({ name: 1 });

        return res.status(200).json({
            success: true,
            count: skillList.length,
            data: skillList
        });

    } catch (error) {
        console.error('Errore recupero Skills:', error);
        return res.status(500).json({
            success: false,
            message: 'Errore del server durante il recupero delle skill'
        });
    }
});

export default router;