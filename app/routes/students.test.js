import request from 'supertest';
import app from '../server.js';
import Student from '../models/Student.js';
import Education from '../models/Education.js';
import { sendVerificationEmail } from '../utils/emailService.js';
import bcrypt from 'bcryptjs';

jest.mock('../models/Student.js');
jest.mock('../models/Education.js');
jest.mock('../utils/emailService.js');
jest.mock('bcryptjs');

describe('POST /api/v1/students/registration', () => {
    const validPayload = {
        name: 'Mario',
        surname: 'Rossi',
        email: 'mario.rossi@studenti.unimi.it',
        password: 'passwordSicura123!',
        education: '64b0f1234567890123456789', // Mocked Objid
        educationYear: 3
    };

    beforeEach(() => {
        jest.clearAllMocks();
        bcrypt.hash.mockResolvedValue('test_hashed_password_xyz');
    });

    test('Dovrebbe registrare uno studente con successo (201)', async () => {
        Student.findOne.mockResolvedValue(null);

        Education.findById.mockResolvedValue({ _id: validPayload.education, name: 'Unitn' });

        Student.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue({
                _id: 'new_student_id',
                email: validPayload.email
            }),
            email: validPayload.email
        }));

        sendVerificationEmail.mockResolvedValue(true);

        const res = await request(app)
            .post('/api/v1/students/registration')
            .send(validPayload);

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('Registrazione avvenuta con successo');
        expect(sendVerificationEmail).toHaveBeenCalled();
    });

    test('Dovrebbe fallire se l\'email è già registrata (409)', async () => {
        Student.findOne.mockResolvedValue({ email: validPayload.email });

        const res = await request(app)
            .post('/api/v1/students/registration')
            .send(validPayload);

        expect(res.statusCode).toBe(409);
        expect(res.body.message).toMatch(/già registrata/i);
    });

    test('Dovrebbe fallire se l\'istituto (Education) non esiste (400)', async () => {
        Student.findOne.mockResolvedValue(null);
        Education.findById.mockResolvedValue(null);

        const res = await request(app)
            .post('/api/v1/students/registration')
            .send(validPayload);

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('L\'istituto selezionato non esiste');
    });
});