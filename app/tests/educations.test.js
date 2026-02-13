import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../server.js';
import Education from '../models/Education.js';

jest.mock('../models/Education.js');

describe('Education Routes', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/v1/educations', () => {

        test('Dovrebbe restituire la lista degli istituti con successo (200)', async () => {
            const mockEducations = [
                { _id: '1', name: 'Politecnico di Milano', university: true },
                { _id: '2', name: 'ITIS Fermi', university: false }
            ];

            const mockSort = jest.fn().mockResolvedValue(mockEducations);
            const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
            Education.find.mockReturnValue({ select: mockSelect });

            const res = await request(app).get('/api/v1/educations');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(2);
            expect(res.body.data).toEqual(mockEducations);

            expect(Education.find).toHaveBeenCalled();
            expect(mockSelect).toHaveBeenCalledWith('name university');
            expect(mockSort).toHaveBeenCalledWith({ name: 1 });
        });

        test('Dovrebbe restituire una lista vuota se non ci sono istituti (200)', async () => {
            const mockEducations = [];

            const mockSort = jest.fn().mockResolvedValue(mockEducations);
            const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
            Education.find.mockReturnValue({ select: mockSelect });

            const res = await request(app).get('/api/v1/educations');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(0);
            expect(res.body.data).toEqual([]);
        });

        test('Dovrebbe gestire errori del database (500)', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            Education.find.mockImplementation(() => {
                throw new Error('Database connection failed');
            });

            const res = await request(app).get('/api/v1/educations');

            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Errore del server durante il recupero degli istituti');

            consoleSpy.mockRestore();
        });
    });
});
