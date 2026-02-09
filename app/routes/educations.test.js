import request from 'supertest';
import app from '../server.js';
import Education from '../models/Education.js';

jest.mock('../models/Education.js');

describe('GET /api/v1/educations', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Dovrebbe restituire la lista degli istituti (200)', async () => {
        const mockData = [
            { name: 'Galileo Galilei', university: false },
            { name: 'Psicologia - UNITN', university: true },
            { name: 'Informatica - UNITN', university: true }
        ];

        const mockSort = jest.fn().mockResolvedValue(mockData);
        const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
        Education.find.mockReturnValue({ select: mockSelect });

        const res = await request(app).get('/api/v1/educations');

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBe(3);
        expect(res.body.data[0].name).toBe('Galileo Galilei');
    });

    test('Dovrebbe gestire errori del database (500)', async () => {
        const mockSort = jest.fn().mockRejectedValue(new Error('DB Error'));
        const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
        Education.find.mockReturnValue({ select: mockSelect });

        const res = await request(app).get('/api/v1/educations');

        expect(res.statusCode).toBe(500);
        expect(res.body.success).toBe(false);
    });
});