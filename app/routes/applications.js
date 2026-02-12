import express from 'express';
import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Offer from '../models/Offer.js';
import tokenChecker from '../middleware/tokenVerify.js';
import { authorize } from '../middleware/roleCheck.js';
import validateApplication from '../middleware/validateApplication.js';

const router = express.Router();

// ---------------------------------------------
// 1. GET /api/v1/applications/check/:offerId
// Verifica se lo studente ha una candidatura ATTIVA
// ---------------------------------------------
router.get('/check/:offerId', tokenChecker, authorize(['Student']), async (req, res) => {
    try {
        const { offerId } = req.params;
        const studentId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(offerId)) {
            return res.status(400).json({ success: false, message: 'ID offerta non valido' });
        }

        const existingApp = await Application.findOne({ student: studentId, offer: offerId });

        // MODIFICA QUI:
        // Consideriamo che l'utente si è "già candidato" SOLO se la candidatura esiste 
        // E lo status NON è 'withdrawn'. Se è ritirata, permettiamo di riprovare.
        const isActiveApplication = existingApp && existingApp.status !== 'withdrawn';

        res.json({
            success: true,
            hasApplied: isActiveApplication,
            applicationDate: isActiveApplication ? existingApp.createdAt : null,
            status: existingApp ? existingApp.status : null
        });

    } catch (err) {
        console.error("Errore Check Application:", err);
        res.status(500).json({ success: false, message: "Errore durante la verifica della candidatura" });
    }
});

// ---------------------------------------------
// 2. POST /api/v1/applications/apply
// Crea o Riattiva una candidatura
// ---------------------------------------------
router.post('/apply', tokenChecker, authorize(['Student']), validateApplication, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { offerId, message } = req.body;
        const studentId = req.user.id;

        // A. Controllo esistenza Offerta
        const offer = await Offer.findById(offerId).session(session);
        if (!offer || offer.status !== 'published') {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Offerta non disponibile' });
        }

        if (offer.expirationDate && new Date(offer.expirationDate) < new Date()) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Questa offerta è scaduta' });
        }

        // B. Controllo Candidatura Esistente
        const existingApp = await Application.findOne({ student: studentId, offer: offerId }).session(session);

        if (existingApp) {
            // CASO 1: Candidatura esistente ma RITIRATA -> RIATTIVIAMO
            if (existingApp.status === 'withdrawn') {
                existingApp.status = 'pending';
                existingApp.message = message || existingApp.message; // Aggiorna messaggio se fornito
                // Aggiungiamo alla timeline l'evento di "re-invio"
                existingApp.history.push({
                    status: 'pending',
                    changedAt: new Date(),
                    note: 'Candidatura reinviata dopo ritiro'
                });

                await existingApp.save({ session });
                await session.commitTransaction();

                console.log(`🔄 Candidatura riattivata: Studente ${studentId} -> Offerta ${offerId}`);

                return res.status(200).json({
                    success: true,
                    message: 'Candidatura inviata nuovamente con successo!',
                    data: existingApp
                });
            }
            // CASO 2: Candidatura già attiva -> ERRORE
            else {
                await session.abortTransaction();
                return res.status(409).json({ success: false, message: 'Ti sei già candidato a questa offerta' });
            }
        }

        // CASO 3: Nessuna candidatura -> CREIAMO NUOVA
        const newApplication = new Application({
            student: studentId,
            offer: offerId,
            employer: offer.employer,
            message: message || '',
            status: 'pending',
            history: [{ status: 'pending', changedAt: new Date() }]
        });

        await newApplication.save({ session });
        await session.commitTransaction();

        console.log(`✅ Nuova candidatura: Studente ${studentId} -> Offerta ${offerId}`);

        res.status(201).json({
            success: true,
            message: 'Candidatura inviata con successo!',
            data: newApplication
        });

    } catch (err) {
        await session.abortTransaction();
        console.error('Errore candidatura:', err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    } finally {
        session.endSession();
    }
});

// ---------------------------------------------
// 3. GET /api/v1/applications/student
// Recupera storico candidature
// ---------------------------------------------
router.get('/student', tokenChecker, authorize(['Student']), async (req, res) => {
    try {
        const { status, sort } = req.query;
        const query = { student: req.user.id };

        if (status) {
            query.status = status;
        }

        const applications = await Application.find(query)
            .populate({
                path: 'offer',
                select: 'position contractType workLocation salary',
                populate: { path: 'employer', select: 'companyName logo' }
            })
            .sort({ createdAt: sort === 'oldest' ? 1 : -1 });

        res.json({
            success: true,
            count: applications.length,
            data: applications
        });

    } catch (err) {
        console.error('Errore recupero candidature:', err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

// AGGIUNGI O SOSTITUISCI QUESTA ROTTA in routes/applications.js

// ---------------------------------------------
// 4. PATCH /api/v1/applications/offer/:offerId/withdraw
// Ritira candidatura passando l'ID dell'OFFERTA
// ---------------------------------------------
router.patch('/offer/:offerId/withdraw', tokenChecker, authorize(['Student']), async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { offerId } = req.params;
        const { reason } = req.body;
        const studentId = req.user.id;

        // Cerchiamo la candidatura specifica per questa offerta e questo studente
        const application = await Application.findOne({
            offer: offerId,
            student: studentId
        }).session(session);

        if (!application) {
            await session.abortTransaction();
            // Debug log
            console.log(`Candidatura non trovata per Student: ${studentId} e Offer: ${offerId}`);
            return res.status(404).json({ success: false, message: 'Nessuna candidatura attiva trovata per questa offerta.' });
        }

        if (['accepted', 'rejected'].includes(application.status)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Non puoi ritirare una candidatura già valutata.' });
        }

        // Se è già ritirata, restituiamo successo senza fare nulla o errore (dipende dalla UX)
        if (application.status === 'withdrawn') {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Candidatura già ritirata.' });
        }

        // Aggiornamento
        application.status = 'withdrawn';
        application.history.push({
            status: 'withdrawn',
            changedAt: new Date(),
            note: reason || 'Ritiro volontario'
        });

        await application.save({ session });
        await session.commitTransaction();

        res.json({ success: true, message: 'Candidatura ritirata con successo' });

    } catch (err) {
        await session.abortTransaction();
        console.error("Errore Withdraw:", err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    } finally {
        session.endSession();
    }
});

export default router;