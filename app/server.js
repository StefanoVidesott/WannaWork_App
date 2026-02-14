import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

import yaml from 'js-yaml';
import Path from 'path';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import connectDB from './config/database.js';

import authRoutes from './routes/auth.js';
import studentsRouter from './routes/students.js';
import skillsRouter from './routes/skills.js';
import employersRouter from './routes/employers.js';
import educationsRouter from './routes/educations.js';
import availabilityProfileRouter from './routes/availabilityProfiles.js';
import offersRouter from './routes/offers.js';
import applicationsRouter from './routes/applications.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = Path.dirname(currentFilePath);

const swaggerDocument = yaml.load(readFileSync(Path.join(currentDirPath, '..', 'docs', 'oas3.yaml'), 'utf8'));

dotenv.config();

if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://wannawork.docs.apiary.io/',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Non consentito da CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
    credentials: true,
    optionsSuccessStatus: 204
}));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/students', studentsRouter);
app.use('/api/v1/availabilityProfile', availabilityProfileRouter);
app.use('/api/v1/employers', employersRouter);
app.use('/api/v1/skills', skillsRouter);
app.use('/api/v1/educations', educationsRouter);
app.use('/api/v1/offers', offersRouter);
app.use('/api/v1/applications', applicationsRouter);

app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check
app.get('/api/v1/health', (req, res) => {
    res.json({ status: 'OK', message: 'WannaWork API is running' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint non trovato' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Errore interno del server' });
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 WannaWork API in esecuzione su porta ${PORT}`);
        console.log(`📍 URL locale: http://localhost:${PORT}/api/v1`);
    });
}

export default app;
