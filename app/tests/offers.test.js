import request from 'supertest';
import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import express from 'express';

import Offer from '../models/Offer.js';
import Application from '../models/Application.js';
import Employer from '../models/Employer.js';
import { sendOfferDeletedNotification } from '../utils/emailService.js';
import offersRouter from '../routes/offers.js';

jest.mock('../models/Offer.js');
jest.mock('../models/Application.js');
jest.mock('../models/Employer.js');
jest.mock('../utils/emailService.js');

jest.mock('../middleware/tokenChecker.js', () => (req, res, next) => {
    if (!req.user) req.user = { id: '609c15c2b0c5e326b4e41111', userType: 'Employer' };
    next();
});

jest.mock('../middleware/validateOffer.js', () => (req, res, next) => next());

import app from '../server.js';

describe('Offer Routes', () => {

    const mockEmployerId = '609c15c2b0c5e326b4e41111';
    const mockOfferId = '609c15c2b0c5e326b4e42222';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/v1/offers/create', () => {
        const validPayload = {
            position: 'Junior Dev',
            description: 'Develop stuff',
            desiredSkills: ['Java'],
            workHours: 'Full Time',
            workLocation: 'Milano',
            contactMethod: 'email@test.com'
        };

        test('Dovrebbe creare un offerta con successo (201)', async () => {
            Employer.findById.mockResolvedValue({
                _id: mockEmployerId,
                companyName: 'Tech Corp',
                headquarters: 'Milano'
            });

            Offer.mockImplementation(() => ({
                save: jest.fn().mockResolvedValue(true),
                _id: mockOfferId
            }));

            const res = await request(app)
                .post('/api/v1/offers/create')
                .send(validPayload);

            expect(res.statusCode).toBe(201);
            expect(res.body.message).toMatch(/pubblicata con successo/);
        });

        test('Dovrebbe bloccare se non Employer (403)', async () => {
            const testApp = express();
            testApp.use(express.json());
            testApp.use((req, res, next) => {
                req.user = { id: 'student_123', userType: 'Student' };
                next();
            });
            testApp.use('/api/v1/offers', offersRouter);

            const res = await request(testApp)
                .post('/api/v1/offers/create')
                .send(validPayload);

            expect(res.statusCode).toBe(403);
        });

        test('Dovrebbe fallire se profilo employer incompleto (400)', async () => {
            Employer.findById.mockResolvedValue({
                _id: mockEmployerId,
                companyName: ''
            });

            const res = await request(app)
                .post('/api/v1/offers/create')
                .send(validPayload);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/Completa il tuo profilo/);
        });
    });

    describe('GET /api/v1/offers/list', () => {
        test('Dovrebbe restituire lista paginata (200)', async () => {
            const mockLimit = jest.fn().mockResolvedValue([{ title: 'Offer 1' }]);
            const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
            const mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });

            Offer.find.mockReturnValue({ populate: mockPopulate });
            Offer.countDocuments.mockResolvedValue(1);

            const res = await request(app).get('/api/v1/offers/list');

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(Offer.find).toHaveBeenCalledWith({ status: 'published' });
        });
    });

    describe('GET /api/v1/offers/my-offers', () => {
        test('Dovrebbe restituire offerte dell\'employer con conteggio candidature (200)', async () => {
            const mockOffers = [{ _id: 'offer1', position: 'Sviluppatore' }];
            const mockLean = jest.fn().mockResolvedValue(mockOffers);
            const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
            Offer.find.mockReturnValue({ sort: mockSort });

            Application.countDocuments.mockResolvedValue(3);

            const res = await request(app).get('/api/v1/offers/my-offers');

            expect(res.statusCode).toBe(200);
            expect(Offer.find).toHaveBeenCalledWith({ employer: mockEmployerId });

            expect(res.body.data[0].applicationCount).toBe(3);
        });
    });

    describe('GET /api/v1/offers/:id', () => {
        test('Dovrebbe restituire dettaglio offerta (200)', async () => {
            const mockOffer = { _id: mockOfferId, position: 'Dev' };

            const mockPopulate2 = jest.fn().mockResolvedValue(mockOffer);
            const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
            Offer.findOne.mockReturnValue({ populate: mockPopulate1 });

            const res = await request(app).get(`/api/v1/offers/${mockOfferId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toEqual(mockOffer);
        });

        test('Dovrebbe restituire 404 se offerta non esiste', async () => {
            const mockPopulate2 = jest.fn().mockResolvedValue(null);
            const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });
            Offer.findOne.mockReturnValue({ populate: mockPopulate1 });

            const res = await request(app).get(`/api/v1/offers/${mockOfferId}`);

            expect(res.statusCode).toBe(404);
        });
    });

    describe('PUT /api/v1/offers/:id', () => {
        test('Dovrebbe aggiornare offerta se proprietario (200)', async () => {
            const mockOffer = {
                _id: mockOfferId,
                employer: { toString: () => mockEmployerId },
                position: 'Old Pos',
                desiredSkills: [],
                save: jest.fn().mockResolvedValue(true)
            };

            Offer.findById.mockResolvedValue(mockOffer);

            Application.find.mockReturnValue({
                populate: jest.fn().mockResolvedValue([])
            });

            const res = await request(app)
                .put(`/api/v1/offers/${mockOfferId}`)
                .send({ position: 'New Pos' });

            expect(res.statusCode).toBe(200);
            expect(mockOffer.position).toBe('New Pos');
            expect(mockOffer.save).toHaveBeenCalled();
        });

        test('Dovrebbe vietare aggiornamento se non proprietario (403)', async () => {
            const mockOffer = {
                employer: { toString: () => '609c15c2b0c5e326b4e49999' }
            };
            Offer.findById.mockResolvedValue(mockOffer);

            const res = await request(app)
                .put(`/api/v1/offers/${mockOfferId}`)
                .send({ position: 'Hacked' });

            expect(res.statusCode).toBe(403);
        });
    });

    describe('DELETE /api/v1/offers/:id', () => {
        const sessionMock = {
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            abortTransaction: jest.fn(),
            endSession: jest.fn(),
            inTransaction: jest.fn().mockReturnValue(true)
        };

        beforeEach(() => {
            mongoose.startSession = jest.fn().mockResolvedValue(sessionMock);
        });

        test('Dovrebbe eliminare offerta, notificare candidati e aggiornare status (200)', async () => {
            const mockOffer = {
                _id: mockOfferId,
                employer: { toString: () => mockEmployerId },
                position: 'Job Title'
            };
            Offer.findById.mockReturnValue({ session: () => mockOffer });

            const mockApplications = [
                { student: { email: 's1@test.com', name: 'S1' } }
            ];
            const sessionAppMock = jest.fn().mockResolvedValue(mockApplications);
            const populateAppMock = jest.fn().mockReturnValue({ session: sessionAppMock });
            Application.find.mockReturnValue({ populate: populateAppMock });

            Application.updateMany.mockReturnValue({ session: jest.fn().mockResolvedValue(true) });

            Offer.deleteOne.mockReturnValue({ session: jest.fn().mockResolvedValue(true) });

            sendOfferDeletedNotification.mockResolvedValue(true);

            const res = await request(app)
                .delete(`/api/v1/offers/${mockOfferId}`)
                .send({ reason: 'Chiusura' });

            expect(res.statusCode).toBe(200);
            expect(sessionMock.startTransaction).toHaveBeenCalled();
            expect(sessionMock.commitTransaction).toHaveBeenCalled();
            expect(Application.updateMany).toHaveBeenCalled();
            expect(Offer.deleteOne).toHaveBeenCalled();
            expect(sendOfferDeletedNotification).toHaveBeenCalledWith('s1@test.com', 'Job Title', 'Chiusura');
        });

        test('Dovrebbe fallire se manca motivo (400)', async () => {
            const res = await request(app)
                .delete(`/api/v1/offers/${mockOfferId}`)
                .send({});

            expect(res.statusCode).toBe(400);
            expect(sessionMock.endSession).toHaveBeenCalled();
        });

        test('Dovrebbe rollbackare transazione in caso di errore (500)', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            Offer.findById.mockImplementation(() => { throw new Error('DB Error'); });

            const res = await request(app)
                .delete(`/api/v1/offers/${mockOfferId}`)
                .send({ reason: 'Test' });

            expect(res.statusCode).toBe(500);
            expect(sessionMock.abortTransaction).toHaveBeenCalled();
            expect(sessionMock.endSession).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });
});
