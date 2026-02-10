import express from 'express';
import Student from '../models/Student.js';
import Education from '../models/Education.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import validateStudentRegistration from '../middleware/validStudentRegistration.js';
import { sendVerificationEmail } from '../utils/emailService.js';

const router = express.Router();

// POST /api/v1/students/registration
router.post('/registration', validateStudentRegistration, async (req, res) => {
	try {
		const { name, surname, email, education, educationYear, password } = req.body;

		const existingStudent = await Student.findOne({
			email: email.toLowerCase(),
		});

		if (existingStudent) {
			return res.status(409).json({ success: false, message: 'Questa email è già registrata nel sistema' });
		}

		const existingEducation = await Education.findById(education);
		if (!existingEducation) {
			return res.status(400).json({ success: false, message: 'L\'istituto selezionato non esiste' });
		}

		const saltrounds = 12;
		const hashedPassword = await bcrypt.hash(password, saltrounds);

		const newStudent = new Student({
			name: name.trim(),
			surname: surname.trim(),
			email: email.toLowerCase(),
			education: education,
			educationYear: Number(educationYear),
			password: hashedPassword,
			isVerified: false
		});

		await newStudent.save();

        const emailToken = jwt.sign(
            { id: newStudent._id },
            process.env.EMAIL_SECRET,
            { expiresIn: '24h' }
        );

        try {
            await sendVerificationEmail(newStudent.email, emailToken);
        } catch (emailError) {
            // TODO Se la mail fallisce, cancellare l'utente o avvisarlo ?
            console.error('Fallito invio mail:', emailError);
        }

		return res.status(201).json({
			success: true,
			message: 'Registrazione avvenuta con successo',
			redirect_url: '/login'
		});
	}
	catch (error) {
		console.error('Errore durante la registrazione:', error);

		if (error.name === 'ValidationError') {
			 return res.status(400).json({ success: false, message: 'Dati non validi', error: error.message });
		}

		return res.status(500).json({ success: false, message: 'Errore del server durante la registrazione' });
	}
});

export default router;