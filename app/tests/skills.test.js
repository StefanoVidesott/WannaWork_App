import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../server.js';
import Skill from '../models/Skill.js';

jest.mock('../models/Skill.js');

describe('Skills Routes', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/v1/skills', () => {

        test('Dovrebbe restituire la lista delle skills con successo (200)', async () => {
            const mockSkills = [
                { _id: '1', name: 'Java', type: 'Hard Skill' },
                { _id: '2', name: 'Teamwork', type: 'Soft Skill' }
            ];

            const mockSort = jest.fn().mockResolvedValue(mockSkills);
            const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
            Skill.find.mockReturnValue({ select: mockSelect });

            const res = await request(app).get('/api/v1/skills');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(2);
            expect(res.body.data).toEqual(mockSkills);

            expect(Skill.find).toHaveBeenCalled();
            expect(mockSelect).toHaveBeenCalledWith('name type');
            expect(mockSort).toHaveBeenCalledWith({ name: 1 });
        });

        test('Dovrebbe restituire una lista vuota se non ci sono skills (200)', async () => {
            const mockSkills = [];

            const mockSort = jest.fn().mockResolvedValue(mockSkills);
            const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
            Skill.find.mockReturnValue({ select: mockSelect });

            const res = await request(app).get('/api/v1/skills');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.count).toBe(0);
            expect(res.body.data).toEqual([]);
        });

        test('Dovrebbe gestire errori del database (500)', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            Skill.find.mockImplementation(() => {
                throw new Error('Database connection failed');
            });

            const res = await request(app).get('/api/v1/skills');

            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Errore del server durante il recupero delle skill');

            consoleSpy.mockRestore();
        });
    });
});
