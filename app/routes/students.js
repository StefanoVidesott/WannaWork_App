import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- MODELLI ---
import Student from '../models/Student.js';
import Education from '../models/Education.js';
import Offer from '../models/Offer.js'; // <--- FONDAMENTALE: Se manca questo, crasha tutto

// --- MIDDLEWARE ---
import validateStudentRegistration from '../middleware/validStudentRegistration.js';
import tokenChecker from '../middleware/tokenVerify.js';
import { sendVerificationEmail } from '../utils/emailService.js';

const router = express.Router();

router.post('/registration', validateStudentRegistration, async (req, res) => {
	try {
		const { name, surname, email, education, educationYear, password } = req.body;

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

router.get('/me', tokenChecker, async (req, res) => {
	try {
		const student = await Student.findById(req.user.id).select('-password');
		if (!student) return res.status(404).json({ success: false, message: 'Studente non trovato' });
		res.json(student);
	} catch (err) {
		res.status(500).json({ success: false, message: 'Errore server' });
	}
});

router.get('/offers', tokenChecker, async (req, res) => {
	try {
		// Parametri query
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 12;
		const sortParam = req.query.sort || 'recent';
		const skip = (page - 1) * limit;

		// --- FILTRI ---
		// Nota: Per il debug, ho commentato il controllo sulla data. 
		// Se le tue offerte di prova non hanno una scadenza futura, non si vedrebbero.
		const query = {
			status: 'published',
			// deadline: { $gte: new Date() } // TODO da sistemare secondo modello
		};

		// --- ORDINAMENTO ---
		let sortQuery = { createdAt: -1 };
		if (sortParam === 'deadline') sortQuery = { deadline: 1 };

		// Conta totale
		const total = await Offer.countDocuments(query);

		// Esegui Query
		const offers = await Offer.find(query)
			.populate('employer', 'companyName location logo')
			.sort(sortQuery)
			.skip(skip)
			.limit(limit);

		// console.log(`🔍 Trovate ${offers.length} offerte per lo studente.`);

		res.json({
			success: true,
			data: offers,
			pagination: {
				total,
				page,
				totalPages: Math.ceil(total / limit)
			}
		});

	} catch (err) {
		console.error('❌ Errore GET /offers:', err);
		res.status(500).json({ success: false, message: 'Errore server nel recupero offerte' });
	}
});

// GET /api/v1/students/offers/:id
router.get('/offers/:id', tokenChecker, async (req, res) => {
    try {
        const { id } = req.params;

        // Validazione formato ID MongoDB
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ success: false, message: 'ID offerta non valido' });
        }

        // Cerchiamo l'offerta con i criteri di visibilità per lo studente
        // Deve essere: Pubblicata E (Scadenza futura OR nessuna scadenza)
        const offer = await Offer.findOne({
            _id: id,
            status: 'published',
            // deadline: { $gte: new Date() } // SCOMMENTA in produzione per nascondere le scadute
        }).populate('employer', 'companyName location logo description sector website size email'); 
        // Nota: ho aggiunto campi ipotetici (sector, website, size) che potrebbero essere nel model Employee

        if (!offer) {
            // Se non la troviamo, potrebbe essere scaduta o rimossa
            return res.status(404).json({ 
                success: false, 
                message: 'Offerta non trovata o non più disponibile.' 
            });
        }

        // TODO: Qui potresti incrementare un contatore visualizzazioni
        // await Offer.findByIdAndUpdate(id, { $inc: { views: 1 } });

        res.json({
            success: true,
            data: offer
        });

    } catch (err) {
        console.error('❌ Errore GET /offers/:id', err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

export default router;