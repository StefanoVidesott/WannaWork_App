import express from 'express';
import mongoose from 'mongoose';
import Offer from '../models/Offer.js';
import tokenChecker from '../middleware/tokenVerify.js';
import validateOffer from '../middleware/ValidateOffer.js';

const router = express.Router();

// POST /api/v1/offers - Crea una nuova offerta
router.post('/', tokenChecker, validateOffer, async (req, res) => {
    try {
        // Verifica che sia un Employer
        if (req.user.userType !== 'Employee') {
            return res.status(403).json({ success: false, message: 'Solo i datori di lavoro possono pubblicare offerte.' });
        }

        const newOffer = new Offer({
            employer: req.user.id,
            ...req.body,
            status: 'published'
        });

        await newOffer.save();

        console.log(`📢 Nuova offerta pubblicata: ${newOffer._id} da Employer ${req.user.id}`);

        res.status(201).json({
            success: true,
            message: 'Offerta pubblicata con successo!',
            data: newOffer
        });

    } catch (err) {
        console.error('❌ Errore pubblicazione offerta:', err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

// GET /api/v1/offers/my-offers - Recupera le offerte pubblicate dal datore loggato
router.get('/my-offers', tokenChecker, async (req, res) => {
    try {
        if (req.user.userType !== 'Employee') {
            return res.status(403).json({ success: false, message: 'Accesso negato.' });
        }

        const offers = await Offer.find({ employer: req.user.id }).sort({ createdAt: -1 });
        res.json({ success: true, data: offers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/v1/offers/:id
router.get('/:id', tokenChecker, async (req, res) => {
    try {
        const { id } = req.params;

        // Recuperiamo l'offerta e popoliamo i dati del datore (opzionale)
        const offer = await Offer.findById(id).populate('employer', 'companyName email location logo description');

        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offerta non trovata.'
            });
        }

        // Restituiamo l'offerta
        res.status(200).json({
            success: true,
            data: offer
        });

    } catch (err) {
        console.error('❌ Errore recupero offerta:', err);

        // Gestione errore ID malformato di MongoDB
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'ID offerta non valido' });
        }

        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

// PUT /api/v1/offers/:id - Modifica un'offerta esistente
router.put('/:id', tokenChecker, validateOffer, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // 1. Cerca l'offerta
        const offer = await Offer.findById(id);
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offerta non trovata' });
        }

        // 2. Security Check: Verifica che il datore sia il proprietario (Task 3)
        if (offer.employer.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Non autorizzato a modificare questa offerta' });
        }

        // 3. Aggiornamento campi (PATCH semantics)
        const updateData = {
            ...req.body,
            updatedAt: Date.now()
        };

        const updatedOffer = await Offer.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Modifiche salvate con successo!',
            data: updatedOffer
        });

    } catch (err) {
        console.error('❌ Errore modifica offerta:', err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

// DELETE /api/v1/offers/:id
router.delete('/:id', tokenChecker, async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { id } = req.params;
        const { reason, otherReason } = req.body;
        const userId = req.user.id;

        if (!reason) {
            return res.status(400).json({ success: false, message: 'Motivo eliminazione obbligatorio' });
        }

        session.startTransaction();

        // 1. Verifica proprietà
        const offer = await Offer.findById(id).session(session);
        if (!offer) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Offerta non trovata' });
        }

        if (offer.employer.toString() !== userId) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }

        // 2. Task 2: (Simulazione) Qui andrebbe l'aggiornamento delle candidature associate
        // await Application.updateMany({ offer: id }, { status: 'offer_deleted' }).session(session);

        // 3. Eliminazione fisica
        await Offer.deleteOne({ _id: id }).session(session);

        await session.commitTransaction();
        session.endSession();

        console.log(`🗑️ Offerta ${id} eliminata. Motivo: ${reason}`);

        res.json({ success: true, message: 'Offerta eliminata con successo' });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;