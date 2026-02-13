import request from 'supertest';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import Student from '../models/Student.js';
import Employer from '../models/Employer.js';

jest.mock('../models/Student.js');
jest.mock('../models/Employer.js');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

import app from '../server.js';

describe('Authentication Routes', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test_secret';
        process.env.EMAIL_SECRET = 'email_secret';
    });

    describe('POST /api/v1/auth/login', () => {
        const credentials = {
            email: 'test@example.com',
            password: 'password123'
        };

        const mockUser = {
            _id: 'user_id_123',
            email: 'test@example.com',
            name: 'Mario Rossi',
            password: 'hashed_password',
            isVerified: true
        };

        test('Dovrebbe effettuare il login come Studente con successo (200)', async () => {
            const mockExec = jest.fn().mockResolvedValue(mockUser);
            const mockSelect = jest.fn().mockReturnValue({ exec: mockExec });
            Student.findOne.mockReturnValue({ select: mockSelect });

            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('valid_token');

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send(credentials);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBe('valid_token');
            expect(res.body.user.userType).toBe('Student');

            expect(Student.findOne).toHaveBeenCalledWith({ email: credentials.email });
        });

        test('Dovrebbe effettuare il login come Employer se non è studente (200)', async () => {
            const mockStudentExec = jest.fn().mockResolvedValue(null);
            const mockStudentSelect = jest.fn().mockReturnValue({ exec: mockStudentExec });
            Student.findOne.mockReturnValue({ select: mockStudentSelect });

            const mockEmployer = { ...mockUser, name: undefined, companyName: 'Tech Corp' };
            const mockEmployerExec = jest.fn().mockResolvedValue(mockEmployer);
            const mockEmployerSelect = jest.fn().mockReturnValue({ exec: mockEmployerExec });
            Employer.findOne.mockReturnValue({ select: mockEmployerSelect });

            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('employer_token');

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send(credentials);

            expect(res.statusCode).toBe(200);
            expect(res.body.token).toBe('employer_token');
            expect(res.body.user.userType).toBe('Employer');
            expect(res.body.user.name).toBe('Tech Corp');
        });

        test('Dovrebbe fallire se l\'utente non esiste (404)', async () => {
            Student.findOne.mockReturnValue({ select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) });
            Employer.findOne.mockReturnValue({ select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }) });

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send(credentials);

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Email non trovata');
        });

        test('Dovrebbe fallire se l\'account non è verificato (403)', async () => {
            const unverifiedUser = { ...mockUser, isVerified: false };
            Student.findOne.mockReturnValue({ select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(unverifiedUser) }) });

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send(credentials);

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/Account non verificato/);
        });

        test('Dovrebbe fallire se la password è errata (401)', async () => {
            Student.findOne.mockReturnValue({ select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockUser) }) });
            bcrypt.compare.mockResolvedValue(false);

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send(credentials);

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toBe('Password errata');
        });

        test('Dovrebbe fallire se mancano credenziali (400)', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ email: 'solo@email.com' });

            expect(res.statusCode).toBe(400);
        });
    });

    describe('GET /api/v1/auth/verify-email', () => {
        const mockToken = 'valid_verification_token';
        const mockUserId = 'user_123';

        beforeEach(() => {
            jwt.verify.mockReturnValue({ id: mockUserId });
        });

        test('Dovrebbe verificare email studente con successo (200)', async () => {
            const mockStudent = {
                _id: mockUserId,
                isVerified: false,
                save: jest.fn().mockResolvedValue(true)
            };
            Student.findById.mockResolvedValue(mockStudent);

            const res = await request(app).get(`/api/v1/auth/verify-email?token=${mockToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toMatch(/Email verificata con successo/);
            expect(mockStudent.isVerified).toBe(true);
            expect(mockStudent.save).toHaveBeenCalled();
        });

        test('Dovrebbe restituire successo se email già verificata (200)', async () => {
            const mockStudent = {
                _id: mockUserId,
                isVerified: true,
                save: jest.fn()
            };
            Student.findById.mockResolvedValue(mockStudent);

            const res = await request(app).get(`/api/v1/auth/verify-email?token=${mockToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toMatch(/Email già verificata/);
            expect(mockStudent.save).not.toHaveBeenCalled();
        });

        test('Dovrebbe cercare Employer se Student non trovato (200)', async () => {
            Student.findById.mockResolvedValue(null);
            const mockEmployer = {
                _id: mockUserId,
                isVerified: false,
                save: jest.fn().mockResolvedValue(true)
            };
            Employer.findById.mockResolvedValue(mockEmployer);

            const res = await request(app).get(`/api/v1/auth/verify-email?token=${mockToken}`);

            expect(res.statusCode).toBe(200);
            expect(mockEmployer.save).toHaveBeenCalled();
        });

        test('Dovrebbe fallire se token mancante (400)', async () => {
            const res = await request(app).get('/api/v1/auth/verify-email');
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Token mancante');
        });

        test('Dovrebbe fallire se token non valido (400)', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

            const res = await request(app).get(`/api/v1/auth/verify-email?token=bad_token`);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/Link di verifica non valido/);

            consoleSpy.mockRestore();
        });

        test('Dovrebbe fallire se utente non trovato nel DB (404)', async () => {
            Student.findById.mockResolvedValue(null);
            Employer.findById.mockResolvedValue(null);

            const res = await request(app).get(`/api/v1/auth/verify-email?token=${mockToken}`);

            expect(res.statusCode).toBe(404);
            expect(res.body.message).toBe('Utente non trovato');
        });
    });
});
