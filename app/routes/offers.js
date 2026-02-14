import express from 'express';
import mongoose from 'mongoose';

import Offer from '../models/Offer.js';
import Application from '../models/Application.js';
import Employer from '../models/Employer.js';
import AvailabilityProfile from '../models/AvailabilityProfile.js';

import tokenChecker from '../middleware/tokenChecker.js';
import validateOffer from '../middleware/validateOffer.js';
import { sendOfferUpdatedNotification, sendOfferDeletedNotification } from '../utils/emailService.js';

const router = express.Router();

// POST /api/v1/offers/create
router.post('/create', tokenChecker, async (req, res, next) => {
    if (req.user.userType !== 'Employer') {
        return res.status(403).json({ success: false, message: 'Solo i datori di lavoro possono pubblicare offerte.' });
    }
    next();
}, validateOffer, async (req, res) => {
    try {
        const employerId = req.user.id;

        const employer = await Employer.findById(employerId);
        if (!employer) {
            return res.status(404).json({ success: false, message: 'Profilo azienda non trovato.' });
        }

        if (!employer.companyName || !employer.headquarters) {
            return res.status(400).json({ success: false, message: 'Completa il tuo profilo aziendale (Nome e Sede) prima di pubblicare un\'offerta.' });
        }

        const {
            position, description, desiredSkills,
            workHours, salary, contractType, contractDuration,
            workLocation, contactMethod
        } = req.body;

        const newOffer = new Offer({
            employer: employerId,
            position: position.trim(),
            description: description.trim(),
            desiredSkills: Array.isArray(desiredSkills) ? desiredSkills : [],
            workHours,
            salary,
            contractType,
            contractDuration,
            workLocation,
            contactMethod,
            status: 'published'
        });

        await newOffer.save();

        console.log(`📢 Nuova offerta pubblicata: ${newOffer._id} da Employer ${employerId}`);

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

// GET /api/v1/offers/list
router.get('/list', tokenChecker, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const sortParam = req.query.sort || 'recent';

        const skip = (page - 1) * limit;

        const query = {
            status: 'published',
        };

        let sortQuery = { createdAt: -1 };

        if (sortParam === 'oldest') {
            sortQuery = { createdAt: 1 };
        }

        const total = await Offer.countDocuments(query);

        const offers = await Offer.find(query)
            .populate('employer', 'companyName website')
            .sort(sortQuery)
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            data: offers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        console.error('❌ Errore GET /offers/list:', err);
        res.status(500).json({ success: false, message: 'Errore server nel recupero offerte' });
    }
});

// GET /api/v1/offers/my-offers
router.get('/my-offers', tokenChecker, async (req, res) => {
    try {
        if (req.user.userType !== 'Employer') {
            return res.status(403).json({ success: false, message: 'Accesso negato.' });
        }

        const offers = await Offer.find({ employer: req.user.id }).sort({ createdAt: -1 }).lean();

        const offersWithCounts = await Promise.all(offers.map(async (offer) => {
            const applicationCount = await Application.countDocuments({
                offer: offer._id,
                status: { $ne: 'withdrawn' }
            });
            return { ...offer, applicationCount };
        }));

        res.json({ success: true, data: offersWithCounts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/v1/offers/:id/candidates (NUOVA ROTTA)
router.get('/:id/candidates', tokenChecker, async (req, res) => {
    try {
        if (req.user.userType !== 'Employer') {
            return res.status(403).json({ success: false, message: 'Accesso negato. Solo i datori di lavoro possono vedere i candidati.' });
        }

        const offerId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(offerId)) {
            return res.status(400).json({ success: false, message: 'ID offerta non valido' });
        }

        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offerta non trovata.' });
        }
        if (offer.employer.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Non autorizzato a visualizzare i candidati di questa offerta.' });
        }

        const applications = await Application.find({
            offer: offerId,
            status: { $ne: 'withdrawn' }
        }).populate('student', 'name surname');

        const candidatesData = await Promise.all(applications.map(async (app) => {
            if (!app.student) return null;

            const profile = await AvailabilityProfile.findOne({ student: app.student._id })
                .populate('skills', 'name');

            return {
                _id: app._id,
                studentName: app.student.name,
                studentSurname: app.student.surname,
                applicationDate: app.createdAt,
                profileId: profile ? profile._id : null,
                skills: profile && profile.skills ? profile.skills : []
            };
        }));

        const filteredCandidates = candidatesData.filter(c => c !== null);

        res.json({
            success: true,
            offer: { position: offer.position },
            data: filteredCandidates
        });

    } catch (err) {
        console.error('❌ Errore GET /offers/:id/candidates:', err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

// GET /api/v1/offers/:id
router.get('/:id', tokenChecker, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID offerta non valido' });
        }

        const offer = await Offer.findOne({
            _id: id,
            status: 'published',
        })
            .populate('employer', 'companyName headquarters website email')
            .populate('desiredSkills', 'name type')


        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offerta non trovata o non più disponibile.'
            });
        }

        console.log(`[ANALYTICS] VIEW: User ${req.user.id} viewed Offer ${id} at ${new Date().toISOString()}`);

        res.json({
            success: true,
            data: offer
        });

    } catch (err) {
        console.error('❌ Errore GET /offers/:id', err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

// PUT /api/v1/offers/:id
router.put('/:id', tokenChecker, validateOffer, async (req, res) => {
    try {
        const offerId = req.params.id;
        const userId = req.user.id;

        const offer = await Offer.findById(offerId);

        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offerta non trovata' });
        }

        if (offer.employer.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Non autorizzato a modificare questa offerta' });
        }

        const {
            position, description, desiredSkills,
            workHours, salary, contractType, contractDuration,
            workLocation, contactMethod, status
        } = req.body;

        const changes = {};

        if (position && offer.position !== position) {
            changes.position = { old: offer.position, new: position };
            offer.position = position.trim();
        }
        if (description && offer.description !== description) {
            changes.description = "Updated";
            offer.description = description.trim();
        }
        if (workHours && offer.workHours !== workHours) {
            offer.workHours = workHours;
            changes.workHours = "Updated";
        }

        if (salary) offer.salary = salary;
        if (contractType) offer.contractType = contractType;
        if (contractDuration) offer.contractDuration = contractDuration;
        if (workLocation) offer.workLocation = workLocation;
        if (contactMethod) offer.contactMethod = contactMethod;

        if (Array.isArray(desiredSkills)) {
            const currentSkillsSorted = offer.desiredSkills.map(id => id.toString()).sort();
            const newSkillsSorted = desiredSkills.map(id => id.toString()).sort();

            if (JSON.stringify(currentSkillsSorted) !== JSON.stringify(newSkillsSorted)) {
                offer.desiredSkills = desiredSkills;
                changes.desiredSkills = "Updated";
            }
        }

        if (status && ['published', 'draft', 'expired'].includes(status)) {
            if (offer.status !== status) {
                changes.status = { old: offer.status, new: status };
                offer.status = status;
            }
        }

        if (Object.keys(changes).length === 0) {
            return res.status(200).json({ success: true, message: 'Nessuna modifica rilevata', data: offer });
        }

        console.log(`📝 [AUDIT] Offer ${offerId} updated by ${userId}. Changes:`, changes);

        await offer.save();

        const activeApplications = await Application.find({
            offer: offerId,
            status: { $in: ['pending', 'reviewed'] }
        }).populate('student', 'email');

        if (activeApplications.length > 0) {
            activeApplications.forEach(app => {
                if (app.student && app.student.email) {
                    sendOfferUpdatedNotification(app.student.email, offer.position)
                        .catch(err => console.error(`Errore invio email a ${app.student.email}:`, err));
                }
            });
        }

        res.json({
            success: true,
            message: 'Modifiche salvate con successo!',
            data: offer
        });

    } catch (err) {
        console.error('❌ Errore modifica offerta:', err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

// DELETE /api/v1/offers/:id
router.delete('/:id', tokenChecker, async (req, res) => {
    let session = null;

    try {
        session = await mongoose.startSession();

        const { id } = req.params;
        const { reason, otherReason } = req.body;
        const userId = req.user.id;

        if (!reason) {
            session.endSession();
            return res.status(400).json({ success: false, message: 'Motivo eliminazione obbligatorio' });
        }

        session.startTransaction();

        const offer = await Offer.findById(id).session(session);

        if (!offer) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: 'Offerta non trovata' });
        }

        if (offer.employer.toString() !== userId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ success: false, message: 'Non autorizzato' });
        }

        const applications = await Application.find({
            offer: id,
            status: { $in: ['pending', 'reviewed'] }
        }).populate('student', 'email name').session(session);

        const studentsToNotify = applications
            .filter(app => app.student)
            .map(app => ({
                email: app.student.email,
                name: app.student.name
            }));

        await Application.updateMany(
            { offer: id },
            {
                status: 'rejected',
                $push: { history: { status: 'rejected', changedAt: new Date(), note: `Offerta eliminata: ${reason}` } }
            }
        ).session(session);

        await Offer.deleteOne({ _id: id }).session(session);

        await session.commitTransaction();
        session.endSession();

        if (studentsToNotify.length > 0) {
            console.log(`📧 Invio notifiche a ${studentsToNotify.length} studenti...`);
            const notificationReason = otherReason ? `${reason} - ${otherReason}` : reason;

            studentsToNotify.forEach(student => {
                sendOfferDeletedNotification(student.email, offer.position, notificationReason)
                    .catch(e => console.error(`Errore invio email a ${student.email}:`, e.message));
            });
        }

        res.json({ success: true, message: 'Offerta eliminata e candidati notificati.' });

    } catch (err) {
        if (session && session.inTransaction()) {
            await session.abortTransaction();
        }
        if (session) {
            session.endSession();
        }
        console.error('Delete error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;