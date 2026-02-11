import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

import yaml from 'js-yaml';
import Path from 'path';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import connectDB from './config/database.js';

// Import routes
import studentsRouter from './routes/students.js';
import skillsRouter from './routes/skills.js';
import employeesRouter from './routes/employees.js';
import login from './routes/login.js';
import educationsRouter from './routes/educations.js';
import verifyEmail from './routes/verifyEmail.js';
import AvailabilityProfileRouter from './routes/AvailabilityProfiles.js';
import offersRouter from './routes/offers.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = Path.dirname(currentFilePath);

// Load OpenAPI (Swagger) document
const swaggerDocument = yaml.load(readFileSync(Path.join(currentDirPath, '..', 'docs', 'oas3.yaml'), 'utf8'));

// Configuring application
dotenv.config();

if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// CORS
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Serve openAPI
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/v1/students', studentsRouter);
app.use('/api/v1/employees', employeesRouter);
app.use('/api/v1/login', login);
app.use('/api/v1/skills', skillsRouter);
app.use('/api/v1/educations', educationsRouter);
app.use('/api/v1/verify-email', verifyEmail);
app.use('/api/v1/availabilityProfile', AvailabilityProfileRouter);
app.use('/api/v1/offers', offersRouter);

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

// Listener
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 WannaWork API in esecuzione su porta ${PORT}`);
        console.log(`📍 URL locale: http://localhost:${PORT}/api/v1`);
    });
}

// for the tests
export default app;
