import request from 'supertest';
import app from '../server.js';
import Employee from '../models/Employeer.js';
import { sendVerificationEmail } from '../utils/emailService.js';
import bcrypt from 'bcryptjs';

jest.mock('../models/Employeer.js');
jest.mock('../utils/emailService.js');
jest.mock('bcryptjs');

describe('POST /api/v1/employees/registration', () => {

    const validPayload = {
        companyName: 'Tech Solutions Srl',
        email: 'hr@techsolutions.com',
        password: 'passwordAziendale1!',
        headquarters: 'Via Roma 1, Milano',
        website: 'https://techsolutions.com'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Dovrebbe registrare un\'azienda con successo (201)', async () => {
        // 1. Nessun duplicato trovato
        Employee.findOne.mockResolvedValue(null);

        // 2. Mock del save
        Employee.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue({ _id: 'emp_123', email: validPayload.email }),
            email: validPayload.email
        }));

        const res = await request(app)
            .post('/api/v1/employees/registration')
            .send(validPayload);

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
    });

    test('Dovrebbe fallire se l\'azienda esiste già (409)', async () => {
        // Simuliamo azienda esistente
        Employee.findOne.mockResolvedValue({
            companyName: validPayload.companyName,
            email: validPayload.email
        });

        const res = await request(app)
            .post('/api/v1/employees/registration')
            .send(validPayload);

        expect(res.statusCode).toBe(409);
    });
});