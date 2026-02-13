import request from 'supertest';
import { jest } from '@jest/globals';
import Student from '../models/Student.js';
import Education from '../models/Education.js';
import AvailabilityProfile from '../models/AvailabilityProfile.js';
import Application from '../models/Application.js';
import Offer from '../models/Offer.js';
import { sendVerificationEmail } from '../utils/emailService.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../models/Student.js');
jest.mock('../models/Education.js');
jest.mock('../models/AvailabilityProfile.js');
jest.mock('../models/Application.js');
jest.mock('../models/Offer.js');
jest.mock('../utils/emailService.js');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

jest.mock('../middleware/validStudentRegistration.js', () => (req, res, next) => next());

jest.mock('../middleware/tokenChecker.js', () => (req, res, next) => {
    req.user = { id: 'mocked_student_id', userType: 'Student' };
    next();
});

import app from '../server.js';

describe('Student Routes', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/v1/students/registration', () => {
        const validPayload = {
            name: 'Mario',
            surname: 'Rossi',
            email: 'mario.rossi@studenti.unimi.it',
            password: 'passwordSicura123!',
            education: '64b0f1234567890123456789',
            educationYear: 3,
            privacy: true
        };

        beforeEach(() => {
            bcrypt.hash.mockResolvedValue('hashed_password');
            jwt.sign.mockReturnValue('mocked_token');
        });

        test('Dovrebbe registrare uno studente con successo (201)', async () => {
            Student.findOne.mockResolvedValue(null);
            Education.findById.mockResolvedValue({ _id: validPayload.education });

            const mockSave = jest.fn().mockResolvedValue(true);
            Student.mockImplementation(() => ({
                ...validPayload,
                _id: 'new_student_id',
                save: mockSave
            }));

            sendVerificationEmail.mockResolvedValue(true);

            const res = await request(app)
                .post('/api/v1/students/registration')
                .send(validPayload);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(mockSave).toHaveBeenCalled();
            expect(sendVerificationEmail).toHaveBeenCalled();
        });

        test('Dovrebbe fallire se email già registrata (409)', async () => {
            Student.findOne.mockResolvedValue({ email: validPayload.email });

            const res = await request(app)
                .post('/api/v1/students/registration')
                .send(validPayload);

            expect(res.statusCode).toBe(409);
            expect(res.body.message).toMatch(/già registrata/i);
        });

        test('Dovrebbe fallire se education non esiste (400)', async () => {
            Student.findOne.mockResolvedValue(null);
            Education.findById.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/v1/students/registration')
                .send(validPayload);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Istituto non valido');
        });
    });

    describe('GET /api/v1/students/can-apply/:offerId', () => {
        const mockOfferId = '64b0f1234567890123456789';

        test('Dovrebbe restituire canApply: true se tutto ok', async () => {
            AvailabilityProfile.findOne.mockResolvedValue({ status: 'visible' });
            Application.findOne.mockResolvedValue(null);
            Offer.findById.mockResolvedValue({ status: 'published' });

            const res = await request(app).get(`/api/v1/students/can-apply/${mockOfferId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.canApply).toBe(true);
        });

        test('Dovrebbe restituire canApply: false (reason: no profile) se profilo non visibile', async () => {
            AvailabilityProfile.findOne.mockResolvedValue(null);

            const res = await request(app).get(`/api/v1/students/can-apply/${mockOfferId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.canApply).toBe(false);
            expect(res.body.reason).toBe('no profile');
        });

        test('Dovrebbe restituire canApply: false (reason: already applied) se già candidato', async () => {
            AvailabilityProfile.findOne.mockResolvedValue({ status: 'visible' });
            Application.findOne.mockResolvedValue({ status: 'pending' });

            const res = await request(app).get(`/api/v1/students/can-apply/${mockOfferId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.canApply).toBe(false);
            expect(res.body.reason).toBe('already applied');
        });

        test('Dovrebbe permettere candidatura se quella precedente è withdrawn', async () => {
            AvailabilityProfile.findOne.mockResolvedValue({ status: 'visible' });
            Application.findOne.mockResolvedValue(null);
            Offer.findById.mockResolvedValue({ status: 'published' });

            const res = await request(app).get(`/api/v1/students/can-apply/${mockOfferId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.canApply).toBe(true);
        });

        test('Dovrebbe restituire canApply: false (reason: offer unavailable) se offerta non pubblicata', async () => {
            AvailabilityProfile.findOne.mockResolvedValue({ status: 'visible' });
            Application.findOne.mockResolvedValue(null);
            Offer.findById.mockResolvedValue(null);

            const res = await request(app).get(`/api/v1/students/can-apply/${mockOfferId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.canApply).toBe(false);
            expect(res.body.reason).toBe('offer unavailable');
        });

        test('Dovrebbe restituire 400 se ID offerta non valido', async () => {
            const res = await request(app).get('/api/v1/students/can-apply/invalid-id');
            expect(res.statusCode).toBe(400);
        });
    });
});
