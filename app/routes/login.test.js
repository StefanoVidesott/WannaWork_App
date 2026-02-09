import request from 'supertest';
import app from '../server.js';
import Student from '../models/Student.js';
import Employee from '../models/Employeer.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../models/Student.js');
jest.mock('../models/Employeer.js');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('POST /api/v1/login', () => {
    const loginData = { email: 'test@user.com', password: 'password123' };

    // Helper per mockare la catena findOne().select().exec()
    const mockFindOneChain = (result) => {
        return {
            select: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(result)
            })
        };
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jwt.sign.mockReturnValue('fake_jwt_token');
    });

    test('Login Studente: successo (200)', async () => {
        const mockStudent = {
            _id: 'std_1',
            email: 'test@user.com',
            password: 'hashed_pw',
            toObject: () => ({})
        };

        // Studente trovato
        Student.findOne.mockReturnValue(mockFindOneChain(mockStudent));
        // Employee non chiamato (o ritorna null se chiamato)
        Employee.findOne.mockReturnValue(mockFindOneChain(null));

        // Password corretta
        bcrypt.compare.mockResolvedValue(true);

        const res = await request(app).post('/api/v1/login').send(loginData);

        expect(res.statusCode).toBe(200);
        expect(res.body.userType).toBe('Student');
        expect(res.body.token).toBe('fake_jwt_token');
    });

    test('Login Employee: successo (200) quando studente non trovato', async () => {
        const mockEmployee = {
            _id: 'emp_1',
            email: 'test@user.com',
            password: 'hashed_pw',
            toObject: () => ({})
        };

        // Studente NON trovato
        Student.findOne.mockReturnValue(mockFindOneChain(null));
        // Employee trovato
        Employee.findOne.mockReturnValue(mockFindOneChain(mockEmployee));

        bcrypt.compare.mockResolvedValue(true);

        const res = await request(app).post('/api/v1/login').send(loginData);

        expect(res.statusCode).toBe(200);
        expect(res.body.userType).toBe('Employee');
    });

    test('Login fallito: utente non esiste (401)', async () => {
        Student.findOne.mockReturnValue(mockFindOneChain(null));
        Employee.findOne.mockReturnValue(mockFindOneChain(null));

        const res = await request(app).post('/api/v1/login').send(loginData);

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Credenziali non valide');
    });

    test('Login fallito: password errata (401)', async () => {
        const mockUser = {
            email: 'test@user.com',
            password: 'hashed_pw',
            toObject: () => ({})
        };

        Student.findOne.mockReturnValue(mockFindOneChain(mockUser));
        // Password non coincide
        bcrypt.compare.mockResolvedValue(false);

        const res = await request(app).post('/api/v1/login').send(loginData);

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Credenziali non valide');
    });
});