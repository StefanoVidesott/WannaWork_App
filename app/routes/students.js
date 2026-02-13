import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import Student from '../models/Student.js';
import Education from '../models/Education.js';
import Application from '../models/Application.js';
import AvailabilityProfile from '../models/AvailabilityProfile.js';
import Offer from '../models/Offer.js';

import validateStudentRegistration from '../middleware/validStudentRegistration.js';
import tokenChecker from '../middleware/tokenChecker.js';
import { sendVerificationEmail } from '../utils/emailService.js';

const router = express.Router();

router.post('/registration', validateStudentRegistration, async (req, res) => {
	try {
		const { name, surname, email, education, educationYear, password, confirmPassword, privacy } = req.body;

		const existingStudent = await Student.findOne({ email: email.toLowerCase() });
		if (existingStudent) {
			return res.status(409).json({ success: false, message: 'Email già registrata' });
		}

		const existingEducation = await Education.findById(education);
		if (!existingEducation) {
			return res.status(400).json({ success: false, message: 'Istituto non valido' });
		}

		const hashedPassword = await bcrypt.hash(password, 12);

		const newStudent = new Student({
			name: name.trim(),
			surname: surname.trim(),
			email: email.toLowerCase(),
			education,
			educationYear: Number(educationYear),
			password: hashedPassword,
			privacy: privacy,
			isVerified: false
		});

		await newStudent.save();

		const emailToken = jwt.sign({ id: newStudent._id }, process.env.EMAIL_SECRET || 'secret', { expiresIn: '24h' });

		try {
			await sendVerificationEmail(newStudent.email, emailToken);
		} catch (e) { console.error("Warning: mail non inviata", e.message); }

		return res.status(201).json({ success: true, message: 'Registrazione OK', redirect_url: '/login' });

	} catch (error) {
		console.error('Errore registrazione:', error);
		return res.status(500).json({ success: false, message: 'Errore del server' });
	}
});

// GET /api/v1/students/can-apply/:offerId
router.get('/can-apply/:offerId', tokenChecker, async (req, res) => {
	try {
		const { offerId } = req.params;
		const studentId = req.user.id;

		if (!mongoose.Types.ObjectId.isValid(offerId)) {
			return res.status(400).json({ success: false, message: 'ID offerta non valido' });
		}

		const profile = await AvailabilityProfile.findOne({ student: studentId });

		if (!profile || profile.status !== 'visible') {
			return res.status(200).json({
				canApply: false,
				reason: 'no profile'
			});
		}

		const existingApplication = await Application.findOne({
			student: studentId,
			offer: offerId,
			status: { $ne: 'withdrawn' }
		});

		if (existingApplication) {
			return res.status(200).json({
				canApply: false,
				reason: 'already applied'
			});
		}

		const offer = await Offer.findById(offerId);

		if (!offer || offer.status !== 'published') {
			return res.status(200).json({
				canApply: false,
				reason: 'offer unavailable'
			});
		}

		return res.status(200).json({
			canApply: true
		});

	} catch (err) {
		console.error('❌ Errore check can-apply:', err);
		return res.status(500).json({ success: false, message: 'Errore interno del server' });
	}
});

export default router;
