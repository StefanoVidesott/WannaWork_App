import request from 'supertest';
import { jest } from '@jest/globals';
import mongoose from 'mongoose';

jest.mock('../models/Application.js');
jest.mock('../models/Offer.js');
jest.mock('../models/AvailabilityProfile.js');
jest.mock('../utils/emailService.js');

import Application from '../models/Application.js';
import Offer from '../models/Offer.js';
import AvailabilityProfile from '../models/AvailabilityProfile.js';
import {
    sendNewApplicationNotification,
    sendApplicationWithdrawnNotification
} from '../utils/emailService.js';
import app from '../server.js';

jest.mock('../middleware/tokenChecker.js', () => (req, res, next) => {
    req.user = { id: '609c15c2b0c5e326b4e41111', userType: 'Student' };
    next();
});

jest.mock('../middleware/roleCheck.js', () => ({
    authorize: (roles) => (req, res, next) => next()
}));

describe('Application Routes', () => {

    const mockStudentId = '609c15c2b0c5e326b4e41111';
    const mockOfferId = '609c15c2b0c5e326b4e42222';
    const mockEmployerId = '609c15c2b0c5e326b4e43333';

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
        sendNewApplicationNotification.mockResolvedValue(true);
        sendApplicationWithdrawnNotification.mockResolvedValue(true);
    });

    describe('POST /api/v1/applications/apply', () => {
        test('Dovrebbe inviare candidatura con successo (201)', async () => {
            const mockProfile = { student: { name: 'Mario', surname: 'Rossi' } };
            const populateProfile = jest.fn().mockResolvedValue(mockProfile);
            const sessionProfile = jest.fn().mockReturnValue({ populate: populateProfile });
            AvailabilityProfile.findOne.mockReturnValue({ session: sessionProfile });

            const mockOffer = {
                _id: mockOfferId,
                status: 'published',
                employer: { _id: mockEmployerId, email: 'employer@test.com' },
                position: 'Sviluppatore Web'
            };
            const sessionOffer = jest.fn().mockResolvedValue(mockOffer);
            const populateOffer = jest.fn().mockReturnValue({ session: sessionOffer });
            Offer.findById.mockReturnValue({ populate: populateOffer });

            const sessionAppCheck = jest.fn().mockResolvedValue(null);
            Application.findOne.mockReturnValue({ session: sessionAppCheck });

            Application.mockImplementation(() => ({
                save: jest.fn().mockResolvedValue(true)
            }));

            const res = await request(app)
                .post('/api/v1/applications/apply')
                .send({ offerId: mockOfferId });

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toMatch(/inviata con successo/);
            expect(sessionMock.commitTransaction).toHaveBeenCalled();
            expect(sendNewApplicationNotification).toHaveBeenCalled();
        });

        test('Dovrebbe riattivare una candidatura "withdrawn" (200)', async () => {
            const populateProfile = jest.fn().mockResolvedValue({ student: { name: 'M', surname: 'R' } });
            AvailabilityProfile.findOne.mockReturnValue({ session: jest.fn().mockReturnValue({ populate: populateProfile }) });

            const mockOffer = { status: 'published', employer: { _id: mockEmployerId } };
            Offer.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(mockOffer) }) });

            const existingApp = {
                status: 'withdrawn',
                history: [],
                save: jest.fn().mockResolvedValue(true)
            };
            Application.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(existingApp) });

            const res = await request(app).post('/api/v1/applications/apply').send({ offerId: mockOfferId });

            expect(res.statusCode).toBe(200);
            expect(existingApp.status).toBe('pending');
            expect(res.body.message).toMatch(/riattivata/);
        });

        test('Dovrebbe fallire se profilo non visibile (403)', async () => {
            AvailabilityProfile.findOne.mockReturnValue({
                session: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(null)
                })
            });

            const res = await request(app).post('/api/v1/applications/apply').send({ offerId: mockOfferId });

            expect(res.statusCode).toBe(403);
            expect(sessionMock.abortTransaction).toHaveBeenCalled();
        });
    });

    describe('GET /api/v1/applications/check/:offerId', () => {
        test('Dovrebbe ritornare hasApplied: true se candidatura attiva (200)', async () => {
            const mockApp = { status: 'pending', createdAt: new Date() };
            Application.findOne.mockResolvedValue(mockApp);

            const res = await request(app).get(`/api/v1/applications/check/${mockOfferId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.hasApplied).toBe(true);
            expect(res.body.status).toBe('pending');
        });

        test('Dovrebbe ritornare hasApplied: false se withdrawn (200)', async () => {
            const mockApp = { status: 'withdrawn' };
            Application.findOne.mockResolvedValue(mockApp);

            const res = await request(app).get(`/api/v1/applications/check/${mockOfferId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.hasApplied).toBe(false);
        });
    });

    describe('GET /api/v1/applications/student', () => {
        test('Dovrebbe listare le candidature dello studente (200)', async () => {
            const mockApps = [{ status: 'pending' }, { status: 'accepted' }];
            const mockSort = jest.fn().mockResolvedValue(mockApps);
            const mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
            Application.find.mockReturnValue({ populate: mockPopulate });

            const res = await request(app).get('/api/v1/applications/student');

            expect(res.statusCode).toBe(200);
            expect(res.body.count).toBe(2);
            expect(Application.find).toHaveBeenCalledWith(expect.objectContaining({ student: mockStudentId }));
        });
    });

    describe('PATCH /api/v1/applications/offer/:offerId/withdraw', () => {
        test('Dovrebbe ritirare candidatura e notificare il datore (200)', async () => {
            const mockApp = {
                status: 'pending',
                history: [],
                employer: { email: 'employer@test.com' },
                offer: { position: 'Posto di Lavoro' },
                student: { name: 'Mario', surname: 'Rossi' },
                save: jest.fn().mockResolvedValue(true)
            };

            const pop3 = jest.fn().mockResolvedValue(mockApp);
            const pop2 = jest.fn().mockReturnValue({ populate: pop3 });
            const pop1 = jest.fn().mockReturnValue({ populate: pop2 });
            const sessionFind = jest.fn().mockReturnValue({ populate: pop1 });
            Application.findOne.mockReturnValue({ session: sessionFind });

            const res = await request(app)
                .patch(`/api/v1/applications/offer/${mockOfferId}/withdraw`)
                .send({});

            expect(res.statusCode).toBe(200);
            expect(mockApp.status).toBe('withdrawn');
            expect(sessionMock.commitTransaction).toHaveBeenCalled();

            expect(sendApplicationWithdrawnNotification).toHaveBeenCalledWith(
                'employer@test.com',
                'Posto di Lavoro',
                'Mario Rossi'
            );
        });

        test('Dovrebbe fallire se candidatura già valutata (400)', async () => {
            const mockApp = { status: 'accepted' };
            const pop3 = jest.fn().mockResolvedValue(mockApp);
            const pop2 = jest.fn().mockReturnValue({ populate: pop3 });
            const pop1 = jest.fn().mockReturnValue({ populate: pop2 });
            const sessionFind = jest.fn().mockReturnValue({ populate: pop1 });
            Application.findOne.mockReturnValue({ session: sessionFind });

            const res = await request(app)
                .patch(`/api/v1/applications/offer/${mockOfferId}/withdraw`)
                .send({});

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/già valutata/);
            expect(sessionMock.abortTransaction).toHaveBeenCalled();
        });

        test('Dovrebbe restituire 404 se candidatura non trovata', async () => {
            const pop3 = jest.fn().mockResolvedValue(null);
            const pop2 = jest.fn().mockReturnValue({ populate: pop3 });
            const pop1 = jest.fn().mockReturnValue({ populate: pop2 });
            const sessionFind = jest.fn().mockReturnValue({ populate: pop1 });
            Application.findOne.mockReturnValue({ session: sessionFind });

            const res = await request(app)
                .patch(`/api/v1/applications/offer/${mockOfferId}/withdraw`)
                .send({});

            expect(res.statusCode).toBe(404);
        });
    });
});
