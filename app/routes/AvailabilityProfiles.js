import express from 'express';
import ValidationAvailabilityProfile from '../middleware/ValidationAvailabilityProfile.js';
import tokenChecker from '../middleware/tokenVerify.js';
import AvailabilityProfile from '../models/AvailabilityProfile.js';
import bcrypt from 'bcryptjs';
import Student from '../models/Student.js';
import mongoose from 'mongoose';

const router = express.Router();

router.post('/create', tokenChecker, ValidationAvailabilityProfile, async (req, res) => {
    try {
        // Se il middleware funziona, qui vedrai l'ID stampato
        console.log("👤 ROUTE VEDE USER:", req.user);

        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Autenticazione fallita: ID utente non trovato.' });
        }

        const userId = req.user.id;

        // Controllo duplicati
        const existingProfile = await AvailabilityProfile.findOne({ student: userId });
        if (existingProfile) {
            return res.status(400).json({ success: false, message: 'Profilo già esistente' });
        }

        // Estrazione dati (Raw JSON)
        const { phone, skills, experience, workHours, availability } = req.body;

        // Creazione
        const newProfile = new AvailabilityProfile({
            student: userId,
            phone: phone,
            skills: skills,
            experience: experience,
            workHours: workHours,
            availability: availability
        });

        await newProfile.save();

        return res.status(201).json({
            success: true,
            message: 'Profilo creato con successo',
            profile: newProfile
        });

    } catch (err) {
        console.error('❌ ERRORE:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/v1/availabilityProfile/me
router.get('/me', tokenChecker, async (req, res) => {
    try {
        const userId = req.user.id;

        const profile = await AvailabilityProfile.findOne({ student: userId })
            .populate('skills', 'name')
            .exec();

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: 'Profilo non trovato per questo studente.'
            });
        }

        return res.status(200).json({
            success: true,
            profile: profile
        });

    } catch (err) {
        console.error('❌ Errore recupero profilo personale:', err);
        return res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

router.put('/:id', tokenChecker, ValidationAvailabilityProfile, async (req, res) => {
    try {
        const profileId = req.params.id;
        const userId = req.user.id;

        // 1. Cerca profilo
        const profile = await AvailabilityProfile.findById(profileId);
        if (!profile) return res.status(404).json({ success: false, message: 'Profilo non trovato' });

        // 2. Security Check (Solo il proprietario modifica)
        if (profile.student.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }

        // 3. Estrai dati (Il validatore ha già controllato che siano ok se presenti)
        let { phone, skills, experience, workHours, availability } = req.body;

        // Parsing manuale (se usi form-data e il validatore non ha modificato req.body direttamente)
        if (typeof skills === 'string') try { skills = JSON.parse(skills); } catch (e) { }
        if (typeof availability === 'string') try { availability = JSON.parse(availability); } catch (e) { }

        // 4. Aggiorna SOLO se i campi sono presenti (PATCH logic)
        if (phone) profile.phone = phone;
        if (skills) profile.skills = skills;
        if (experience) profile.experience = experience;
        if (workHours) profile.workHours = workHours;
        if (availability) profile.availability = availability;

        // Gestione File
        if (req.file) {
            profile.file = {
                filename: req.file.filename,
                mimeType: req.file.mimetype,
                size: req.file.size,
                path: req.file.path
            };
        }

        await profile.save();

        return res.status(200).json({
            success: true,
            message: 'Profilo aggiornato',
            profile: profile
        });

    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// --- NUOVI IMPORT NECESSARI IN CIMA AL FILE ---

// --- ROTTA DELETE: ELIMINAZIONE PROFILO ---
// Richiede: Token (Auth), Password (Body), 
router.delete('/:id', tokenChecker, async (req, res) => {

    // Avviamo una sessione per la transazione atomica
    const session = await mongoose.startSession();

    try {
        const profileId = req.params.id;
        const userId = req.user.id;
        const { password } = req.body; // La password deve essere inviata nel body

        console.log(`🗑️ Richiesta eliminazione profilo ${profileId}`);

        // 1. VALIDAZIONE INPUT
        if (!password) {
            return res.status(400).json({ success: false, message: 'Password richiesta per confermare l\'eliminazione.' });
        }

        // 2. RECUPERO PROFILO E VERIFICA PROPRIETARIO
        const profile = await AvailabilityProfile.findById(profileId);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profilo non trovato.' });
        }
        if (profile.student.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Non autorizzato. Puoi eliminare solo il tuo profilo.' });
        }

        // 3. VERIFICA IDENTITÀ (PASSWORD CHECK)
        // Recuperiamo l'utente (Student) con la password (che solitamente è esclusa dalle query standard con select: false)
        const user = await Student.findById(userId).select('+password');

        if (!user || !user.password) {
            return res.status(404).json({ success: false, message: 'Utente non trovato o dati corrotti.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Qui il Rate Limiter conteggierà il tentativo fallito
            return res.status(401).json({ success: false, message: 'Password non corretta. Eliminazione annullata.' });
        }

        // 4. AVVIO TRANSAZIONE ATOMICA
        session.startTransaction();

        // A. Hard Delete del Profilo
        await AvailabilityProfile.deleteOne({ _id: profileId }).session(session);

        // B. Soft Delete Candidature (Esempio logico, se hai un modello 'Candidature')
        // await Candidature.updateMany(
        //     { candidate: userId }, 
        //     { status: 'withdrawn_profile_deleted', deletedAt: new Date() }
        // ).session(session);

        // C. Audit Log (Esempio logico)
        // await AuditLog.create([{ 
        //     user: userId, 
        //     action: 'PROFILE_HARD_DELETE', 
        //     timestamp: new Date() 
        // }], { session });

        // D. Gestione File (CV)
        // Nota: Le operazioni su FileSystem non sono transazionali come il DB.
        // Verifichiamo prima se il file esiste e ci segniamo il percorso.
        /*let filePathToDelete = null;
        if (profile.file && profile.file.path) {
            filePathToDelete = profile.file.path;
        }*/

        // 5. COMMIT TRANSAZIONE (Conferma modifiche DB)
        await session.commitTransaction();
        session.endSession();

        // 6. PULIZIA FILESYSTEM (Post-Commit)
        // Eseguiamo l'eliminazione del file solo se il DB ha confermato l'eliminazione.
        /*if (filePathToDelete) {
            fs.unlink(filePathToDelete, (err) => {
                if (err) console.error("⚠️ Errore durante l'eliminazione del file CV:", err);
                else console.log("✅ File CV eliminato correttamente:", filePathToDelete);
            });
        }*/

        // 7. INVALIDAZIONE CACHE / RICERCA (Simulazione)
        // await SearchIndex.remove(profileId);
        // await Cache.del(`profile:${profileId}`);

        return res.status(200).json({
            success: true,
            message: 'Profilo e dati correlati eliminati definitivamente.'
        });

    } catch (err) {
        // Se qualcosa va storto durante la transazione, annulliamo tutto (ROLLBACK)
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();

        console.error('❌ Errore eliminazione profilo:', err);
        return res.status(500).json({ success: false, message: 'Errore server durante l\'eliminazione: ' + err.message });
    }
});

export default router;