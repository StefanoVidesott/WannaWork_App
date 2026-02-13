import request from 'supertest';
import { jest } from '@jest/globals';
import mongoose from 'mongoose';

import AvailabilityProfile from '../models/AvailabilityProfile.js';
import Student from '../models/Student.js';
import Application from '../models/Application.js';
import bcrypt from 'bcryptjs';

import { sendProfileDeletedWithdrawalNotification } from '../utils/emailService.js';

jest.mock('../models/AvailabilityProfile.js');
jest.mock('../models/Student.js');
jest.mock('../models/Application.js');
jest.mock('bcryptjs');
jest.mock('../utils/emailService.js');

jest.mock('../middleware/tokenChecker.js', () => (req, res, next) => {
    if (!req.user) req.user = { id: 'student_123', userType: 'Student' };
    next();
});

jest.mock('../middleware/validationAvailabilityProfile.js', () => (req, res, next) => next());

import app from '../server.js';

describe('Availability Profile Routes', () => {

    const mockStudentId = 'student_123';
    const mockProfileId = 'profile_abc';

    const sessionMock = {
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn(),
        inTransaction: jest.fn().mockReturnValue(true)
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mongoose.startSession = jest.fn().mockResolvedValue(sessionMock);
        bcrypt.compare.mockResolvedValue(true);
    });

    describe('POST /api/v1/availabilityProfile/create', () => {
        const validPayload = {
            phone: '3331234567',
            skills: ['skill_id_1'],
            availability: { dataInizio: '2024-01-01', dataFine: '2024-06-01' }
        };

        test('Dovrebbe creare profilo con successo (201)', async () => {
            AvailabilityProfile.findOne.mockResolvedValue(null);

            AvailabilityProfile.mockImplementation(() => ({
                save: jest.fn().mockResolvedValue(true),
                _id: mockProfileId
            }));

            const res = await request(app)
                .post('/api/v1/availabilityProfile/create')
                .send(validPayload);

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toMatch(/creato con successo/);
        });

        test('Dovrebbe fallire se profilo già esistente (400)', async () => {
            AvailabilityProfile.findOne.mockResolvedValue({ _id: 'existing' });

            const res = await request(app)
                .post('/api/v1/availabilityProfile/create')
                .send(validPayload);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/già esistente/);
        });
    });

    describe('GET /api/v1/availabilityProfile/me', () => {
        test('Dovrebbe restituire il profilo dello studente (200)', async () => {
            const mockProfile = { _id: mockProfileId, student: mockStudentId };

            const mockExec = jest.fn().mockResolvedValue(mockProfile);
            const mockPopulate = jest.fn().mockReturnValue({ exec: mockExec });
            AvailabilityProfile.findOne.mockReturnValue({ populate: mockPopulate });

            const res = await request(app).get('/api/v1/availabilityProfile/me');

            expect(res.statusCode).toBe(200);
            expect(res.body.profile).toEqual(mockProfile);
            expect(AvailabilityProfile.findOne).toHaveBeenCalledWith({ student: mockStudentId });
        });

        test('Dovrebbe restituire 404 se profilo non trovato', async () => {
            const mockExec = jest.fn().mockResolvedValue(null);
            const mockPopulate = jest.fn().mockReturnValue({ exec: mockExec });
            AvailabilityProfile.findOne.mockReturnValue({ populate: mockPopulate });

            const res = await request(app).get('/api/v1/availabilityProfile/me');

            expect(res.statusCode).toBe(404);
        });
    });

    describe('PUT /api/v1/availabilityProfile/:id', () => {
        test('Dovrebbe aggiornare profilo se proprietario (200)', async () => {
            const mockProfile = {
                _id: mockProfileId,
                student: { toString: () => mockStudentId },
                phone: 'Old Phone',
                save: jest.fn().mockResolvedValue(true)
            };

            AvailabilityProfile.findById.mockResolvedValue(mockProfile);

            const res = await request(app)
                .put(`/api/v1/availabilityProfile/${mockProfileId}`)
                .send({ phone: 'New Phone' });

            expect(res.statusCode).toBe(200);
            expect(mockProfile.phone).toBe('New Phone');
            expect(mockProfile.save).toHaveBeenCalled();
        });

        test('Dovrebbe bloccare aggiornamento se non proprietario (403)', async () => {
            const mockProfile = {
                student: { toString: () => 'other_student' }
            };
            AvailabilityProfile.findById.mockResolvedValue(mockProfile);

            const res = await request(app)
                .put(`/api/v1/availabilityProfile/${mockProfileId}`)
                .send({});

            expect(res.statusCode).toBe(403);
        });
    });

    describe('DELETE /api/v1/availabilityProfile/:id', () => {

        test('Dovrebbe eliminare profilo, ritirare candidature E notificare i datori (200)', async () => {
            const mockProfile = {
                _id: mockProfileId,
                student: { toString: () => mockStudentId }
            };
            AvailabilityProfile.findById.mockResolvedValue(mockProfile);

            const mockUser = { password: 'hashed_pwd' };
            const selectMock = jest.fn().mockResolvedValue(mockUser);
            Student.findById.mockReturnValue({ select: selectMock });

            const mockAppsToNotify = [{
                employer: { email: 'datore@test.com' },
                offer: { position: 'Sviluppatore Web' },
                student: { name: 'Mario', surname: 'Rossi' }
            }];

            const queryMock = {
                populate: jest.fn().mockReturnThis(),
                session: jest.fn().mockResolvedValue(mockAppsToNotify)
            };
            Application.find.mockReturnValue(queryMock);

            Application.updateMany.mockReturnValue({ session: jest.fn().mockResolvedValue(true) });
            AvailabilityProfile.deleteOne.mockReturnValue({ session: jest.fn().mockResolvedValue(true) });

            sendProfileDeletedWithdrawalNotification.mockResolvedValue(true);

            const res = await request(app)
                .delete(`/api/v1/availabilityProfile/${mockProfileId}`)
                .send({ password: 'correct_password' });

            expect(res.statusCode).toBe(200);
            expect(sessionMock.startTransaction).toHaveBeenCalled();
            expect(Application.find).toHaveBeenCalled();
            expect(Application.updateMany).toHaveBeenCalled();
            expect(AvailabilityProfile.deleteOne).toHaveBeenCalled();
            expect(sessionMock.commitTransaction).toHaveBeenCalled();

            expect(sendProfileDeletedWithdrawalNotification).toHaveBeenCalledWith(
                'datore@test.com',
                'Sviluppatore Web',
                'Mario Rossi'
            );
        });

        test('Dovrebbe fallire se password errata (401)', async () => {
            AvailabilityProfile.findById.mockResolvedValue({
                student: { toString: () => mockStudentId }
            });
            Student.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ password: 'hash' }) });

            bcrypt.compare.mockResolvedValue(false);

            const res = await request(app)
                .delete(`/api/v1/availabilityProfile/${mockProfileId}`)
                .send({ password: 'wrong' });

            expect(res.statusCode).toBe(401);
            expect(sessionMock.commitTransaction).not.toHaveBeenCalled();
        });

        test('Dovrebbe fallire se manca password (400)', async () => {
            const res = await request(app)
                .delete(`/api/v1/availabilityProfile/${mockProfileId}`)
                .send({});

            expect(res.statusCode).toBe(400);
        });
    });
});
