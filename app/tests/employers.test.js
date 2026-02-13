import request from 'supertest';
import { jest } from '@jest/globals';
import Employer from '../models/Employer.js';
import { sendVerificationEmail } from '../utils/emailService.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../models/Employer.js');
jest.mock('../utils/emailService.js');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

jest.mock('../middleware/validEmployersRegistration.js', () => (req, res, next) => next());

import app from '../server.js';

describe('Employer Routes', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/v1/employers/registration', () => {
        const validPayload = {
            companyName: 'Tech Solutions S.r.l.',
            email: 'hr@techsolutions.com',
            headquarters: 'Via Roma 10, Milano',
            website: 'https://techsolutions.com',
            password: 'passwordSicura123!',
            confirmPassword: 'passwordSicura123!',
            privacy: true
        };

        beforeEach(() => {
            bcrypt.hash.mockResolvedValue('hashed_password_xyz');
            jwt.sign.mockReturnValue('mocked_jwt_token');
        });

        test('Dovrebbe registrare un datore di lavoro con successo (201)', async () => {
            Employer.findOne.mockResolvedValue(null);

            const mockSave = jest.fn().mockResolvedValue(true);
            Employer.mockImplementation(() => ({
                ...validPayload,
                _id: 'new_employer_id',
                save: mockSave
            }));

            sendVerificationEmail.mockResolvedValue(true);

            const res = await request(app)
                .post('/api/v1/employers/registration')
                .send(validPayload);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Registrazione avvenuta con successo');

            expect(Employer.findOne).toHaveBeenCalledWith({ email: validPayload.email });
            expect(mockSave).toHaveBeenCalled();
        });

        test('Dovrebbe fallire se l\'email è già registrata (409)', async () => {
            Employer.findOne.mockResolvedValue({
                _id: 'existing_id',
                email: validPayload.email
            });

            const res = await request(app)
                .post('/api/v1/employers/registration')
                .send(validPayload);

            expect(res.statusCode).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Questa email aziendale è già registrata');
        });

        test('Dovrebbe gestire errori del database durante il salvataggio (500)', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            Employer.findOne.mockResolvedValue(null);
            const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
            Employer.mockImplementation(() => ({ save: mockSave }));

            const res = await request(app)
                .post('/api/v1/employers/registration')
                .send(validPayload);

            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Errore del server durante la registrazione');

            consoleSpy.mockRestore();
        });

        test('Dovrebbe gestire errori di validazione Mongoose (400)', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            Employer.findOne.mockResolvedValue(null);
            const validationError = new Error('Validation failed');
            validationError.name = 'ValidationError';
            const mockSave = jest.fn().mockRejectedValue(validationError);
            Employer.mockImplementation(() => ({ save: mockSave }));

            const res = await request(app)
                .post('/api/v1/employers/registration')
                .send(validPayload);

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Dati non validi');

            consoleSpy.mockRestore();
        });

        test('Dovrebbe completare la registrazione anche se l\'invio email fallisce (201)', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            Employer.findOne.mockResolvedValue(null);
            const mockSave = jest.fn().mockResolvedValue(true);
            Employer.mockImplementation(() => ({ save: mockSave, email: validPayload.email }));

            sendVerificationEmail.mockRejectedValue(new Error('SMTP Error'));

            const res = await request(app)
                .post('/api/v1/employers/registration')
                .send(validPayload);

            expect(res.statusCode).toBe(201);
            expect(mockSave).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });
});
