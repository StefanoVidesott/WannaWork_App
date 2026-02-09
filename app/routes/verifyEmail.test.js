import request from 'supertest';
import app from '../server.js';
import Student from '../models/Student.js';
import Employee from '../models/Employeer.js';
import jwt from 'jsonwebtoken';

jest.mock('../models/Student.js');
jest.mock('../models/Employeer.js');
jest.mock('jsonwebtoken');

describe('GET /api/v1/verify-email', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Verifica con successo (Studente)', async () => {
        const mockToken = 'valid_token';
        const decoded = { id: 'std_123' };

        jwt.verify.mockReturnValue(decoded);

        const mockSave = jest.fn().mockResolvedValue(true);
        const mockUser = {
            _id: 'std_123',
            isVerified: false,
            save: mockSave
        };

        // Trova studente
        Student.findById.mockResolvedValue(mockUser);

        const res = await request(app).get(`/api/v1/verify-email?token=${mockToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toMatch(/Email verificata/);
        expect(mockUser.isVerified).toBe(true);
        expect(mockSave).toHaveBeenCalled();
    });

    test('Token mancante (400)', async () => {
        const res = await request(app).get('/api/v1/verify-email'); // niente query param
        expect(res.statusCode).toBe(400);
    });

    test('Token invalido o scaduto (400)', async () => {
        jwt.verify.mockImplementation(() => { throw new Error('Expired'); });

        const res = await request(app).get('/api/v1/verify-email?token=bad_token');
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toMatch(/non valido o scaduto/);
    });
});