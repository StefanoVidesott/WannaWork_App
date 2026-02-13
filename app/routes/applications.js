import express from 'express';
import mongoose from 'mongoose';

import Application from '../models/Application.js';
import Offer from '../models/Offer.js';
import AvailabilityProfile from '../models/AvailabilityProfile.js';

import tokenChecker from '../middleware/tokenChecker.js';
import { authorize } from '../middleware/roleCheck.js';
import { sendNewApplicationNotification, sendApplicationWithdrawnNotification } from '../utils/emailService.js';

const router = express.Router();

// POST /api/v1/applications/apply
router.post('/apply', tokenChecker, authorize(['Student']), async (req, res) => {
    const session = await mongoose.startSession();

    let offerDetails = null;
    let studentProfile = null;

    try {
        session.startTransaction();
        const { offerId } = req.body;
        const studentId = req.user.id;

        studentProfile = await AvailabilityProfile.findOne({
            student: studentId,
            status: 'visible'
        }).session(session).populate('student', 'name surname email');

        if (!studentProfile) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: 'Devi avere un profilo di disponibilità "visibile" per candidarti.' });
        }

        offerDetails = await Offer.findById(offerId)
            .populate('employer', 'email companyName')
            .session(session);

        if (!offerDetails || offerDetails.status !== 'published') {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Offerta non disponibile' });
        }

        const existingApp = await Application.findOne({ student: studentId, offer: offerId }).session(session);

        if (existingApp) {
            if (existingApp.status === 'withdrawn') {
                existingApp.status = 'pending';
                existingApp.history.push({ status: 'pending', changedAt: new Date(), note: 'Riattivata' });
                await existingApp.save({ session });
                await session.commitTransaction();
                return res.status(200).json({ success: true, message: 'Candidatura riattivata!' });
            } else {
                await session.abortTransaction();
                return res.status(409).json({ success: false, message: 'Ti sei già candidato.' });
            }
        }

        const newApplication = new Application({
            student: studentId,
            offer: offerId,
            employer: offerDetails.employer._id,
            status: 'pending',
            history: [{ status: 'pending', changedAt: new Date() }]
        });

        await newApplication.save({ session });
        await session.commitTransaction();

        session.endSession();

        console.log(`✅ Candidatura inviata: ${studentId} -> ${offerId}`);

        if (offerDetails.employer && offerDetails.employer.email) {
            sendNewApplicationNotification(
                offerDetails.employer.email,
                offerDetails.position,
                `${studentProfile.student.name} ${studentProfile.student.surname}`
            ).catch(err => console.error("Errore invio email datore:", err));
        }

        res.status(201).json({ success: true, message: 'Candidatura inviata con successo!', data: newApplication });

    } catch (err) {
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        console.error('Errore candidatura:', err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

// GET /api/v1/applications/check/:offerId
router.get('/check/:offerId', tokenChecker, authorize(['Student']), async (req, res) => {
    try {
        const { offerId } = req.params;
        const studentId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(offerId)) {
            return res.status(400).json({ success: false, message: 'ID offerta non valido' });
        }

        const existingApp = await Application.findOne({ student: studentId, offer: offerId });

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

// GET /api/v1/applications/student
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
                populate: { path: 'employer', select: 'companyName' }
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

// PATCH /api/v1/applications/offer/:offerId/withdraw
router.patch('/offer/:offerId/withdraw', tokenChecker, authorize(['Student']), async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const { offerId } = req.params;
        const studentId = req.user.id;

        const application = await Application.findOne({ offer: offerId, student: studentId })
            .session(session)
            .populate('employer', 'email')
            .populate('offer', 'position')
            .populate('student', 'name surname');

        if (!application) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Nessuna candidatura attiva trovata.' });
        }

        if (['accepted', 'rejected'].includes(application.status)) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Non puoi ritirare una candidatura già valutata.' });
        }

        if (application.status === 'withdrawn') {
            await session.abortTransaction();
            return res.status(200).json({ success: true, message: 'Candidatura già ritirata.' });
        }

        application.status = 'withdrawn';
        application.history.push({ status: 'withdrawn', changedAt: new Date(), note: 'Ritiro volontario' });

        await application.save({ session });
        await session.commitTransaction();
        session.endSession();

        if (application.employer && application.employer.email) {
            const jobTitle = application.offer ? application.offer.position : 'Offerta';
            const studentName = application.student ? `${application.student.name} ${application.student.surname}` : 'Uno studente';

            sendApplicationWithdrawnNotification(
                application.employer.email,
                jobTitle,
                studentName
            ).catch(err => console.error("Errore invio email ritiro:", err));
        }

        res.json({ success: true, message: 'Candidatura ritirata con successo' });

    } catch (err) {
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

export default router;
