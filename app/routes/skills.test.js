import request from 'supertest';
import app from '../server.js';
import Skill from '../models/Skill.js';

jest.mock('../models/Skill.js');

describe('GET /api/v1/skills', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Dovrebbe restituire la lista delle skills (200)', async () => {
        const mockSkills = [
            { name: 'Java', type: 'Backend' },
            { name: 'React', type: 'Frontend' }
        ];

        const mockSort = jest.fn().mockResolvedValue(mockSkills);
        const mockSelect = jest.fn().mockReturnValue({ sort: mockSort });
        Skill.find.mockReturnValue({ select: mockSelect });

        const res = await request(app).get('/api/v1/skills');

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveLength(2);
    });
});