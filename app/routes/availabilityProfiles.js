import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import AvailabilityProfile from '../models/AvailabilityProfile.js';
import Application from '../models/Application.js';
import Student from '../models/Student.js';

import tokenChecker from '../middleware/tokenChecker.js';
import validateAvailabilityProfile from '../middleware/validationAvailabilityProfile.js';
import { sendProfileDeletedWithdrawalNotification } from '../utils/emailService.js';

const router = express.Router();

// POST /api/v1/availabilityProfile/create
router.post('/create', tokenChecker, async (req, res, next) => {
    if (req.user.userType !== 'Student') {
        return res.status(403).json({ success: false, message: 'Solo gli studenti possono creare un profilo di disponibilità' });
    }
    next();
}, validateAvailabilityProfile, async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Autenticazione fallita: ID utente non trovato.' });
        }

        const userId = req.user.id;

        const existingProfile = await AvailabilityProfile.findOne({ student: userId });
        if (existingProfile) {
            return res.status(400).json({ success: false, message: 'Profilo già esistente' });
        }

        const { phone, skills, experience, workHours, availability } = req.body;

        const newProfile = new AvailabilityProfile({
            student: userId,
            phone: phone,
            skills: skills,
            experience: experience,
            workHours: workHours,
            availability: availability,
            status: "visible"
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

// GET /api/v1/availabilityProfile/:id
router.get('/:id', tokenChecker, async (req, res) => {
    try {
        const profileId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(profileId)) {
            return res.status(400).json({ success: false, message: 'ID profilo non valido.' });
        }

        const profile = await AvailabilityProfile.findById(profileId)
            .populate('student', 'name surname email')
            .populate('skills', 'name type')
            .exec();

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profilo non trovato o rimosso dallo studente.' });
        }

        if (req.user.userType === 'Student' && profile.student._id.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Non sei autorizzato a visualizzare questo profilo.' });
        }

        return res.status(200).json({
            success: true,
            profile: profile
        });

    } catch (err) {
        console.error('❌ Errore recupero profilo:', err);
        return res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

// PUT /api/v1/availabilityProfile/:id
router.put('/:id', tokenChecker, validateAvailabilityProfile, async (req, res) => {
    try {
        const profileId = req.params.id;
        const userId = req.user.id;

        const profile = await AvailabilityProfile.findById(profileId);
        if (!profile) return res.status(404).json({ success: false, message: 'Profilo non trovato' });

        if (profile.student.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Non autorizzato alla modifica di questo profilo' });
        }

        let { phone, skills, experience, workHours, availability } = req.body;

        if (typeof skills === 'string') try { skills = JSON.parse(skills); } catch (e) { }
        if (typeof availability === 'string') try { availability = JSON.parse(availability); } catch (e) { }

        const changes = {};

        if (phone !== undefined && profile.phone !== phone) {
            changes.phone = { old: profile.phone, new: phone };
            profile.phone = phone;
        }

        if (skills !== undefined) {
            profile.skills = skills;
            changes.skills = "Updated";
        }

        if (experience !== undefined) {
            profile.experience = experience;
            changes.experience = "Updated";
        }

        if (workHours !== undefined && profile.workHours !== Number(workHours)) {
            changes.workHours = { old: profile.workHours, new: workHours };
            profile.workHours = workHours;
        }

        if (availability !== undefined) {
            profile.availability = availability;
            changes.availability = "Updated";
        }

        if (Object.keys(changes).length === 0) {
            return res.status(200).json({ success: true, message: 'Nessuna modifica rilevata', profile });
        }

        console.log(`[AUDIT] User ${userId} updated profile ${profileId}. Changes:`, changes);

        await profile.save();

        return res.status(200).json({
            success: true,
            message: 'Modifiche salvate con successo!',
            profile: profile
        });

    } catch (err) {
        console.error('Update Error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/v1/availabilityProfile/:id
router.delete('/:id', tokenChecker, async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const profileId = req.params.id;
        const userId = req.user.id;
        const { password } = req.body;

        console.log(`🗑️ Richiesta eliminazione profilo ${profileId}`);

        if (!password) {
            return res.status(400).json({ success: false, message: 'Password richiesta per confermare l\'eliminazione.' });
        }

        const profile = await AvailabilityProfile.findById(profileId);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profilo non trovato.' });
        }
        if (profile.student.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Non autorizzato. Puoi eliminare solo il tuo profilo.' });
        }

        const user = await Student.findById(userId).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utente studente non trovato.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Password non corretta. Eliminazione annullata.' });
        }

        session.startTransaction();

        const applicationsToNotify = await Application.find({
            student: userId,
            status: { $in: ['pending', 'reviewed'] }
        })
            .populate('employer', 'email')
            .populate('offer', 'position')
            .populate('student', 'name surname')
            .session(session);

        await Application.updateMany(
            { student: userId, status: { $in: ['pending', 'reviewed'] } },
            {
                status: 'withdrawn',
                $push: {
                    history: {
                        status: 'withdrawn',
                        changedAt: new Date(),
                        note: 'Profilo disponibilità eliminato'
                    }
                }
            }
        ).session(session);

        await AvailabilityProfile.deleteOne({ _id: profileId }, { session });

        await session.commitTransaction();
        session.endSession()

        if (applicationsToNotify.length > 0) {
            applicationsToNotify.forEach(app => {
                if (app.employer && app.employer.email) {
                    const studentName = `${app.student.name} ${app.student.surname}`;
                    const jobTitle = app.offer ? app.offer.position : 'Offerta';

                    sendProfileDeletedWithdrawalNotification(
                        app.employer.email,
                        jobTitle,
                        studentName
                    ).catch(err => console.error(`Errore invio notifica a datore ${app.employer.email}:`, err));
                }
            });
        }

        console.log(`✅ Profilo ${profileId} eliminato con successo.`);

        return res.status(200).json({
            success: true,
            message: 'Profilo eliminato definitivamente.'
        });

    } catch (err) {
        if (session.inTransaction()) {
            console.log('↩️ Rollback transazione eliminazione');
            await session.abortTransaction();
        }
        console.error('❌ Errore eliminazione profilo:', err);
        return res.status(500).json({ success: false, message: 'Errore server durante l\'eliminazione' });
    } finally {
        session.endSession();
    }
});

export default router;