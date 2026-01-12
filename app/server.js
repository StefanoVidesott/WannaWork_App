import dotenv from 'dotenv';
import express from 'express';

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
// import AvailabilityProfileRouter from './routes/AvailabilityProfiles.js';

// Import middleware
import tokenChecker from './middleware/tokenVerify.js';


// Determine __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = Path.dirname(__filename);

// Load OpenAPI (Swagger) document
const swaggerDocument = yaml.load(readFileSync(Path.join(__dirname, '..', 'docs', 'oas3.yaml'), 'utf8'));

// Configuring application
dotenv.config();
connectDB();
const app = express();
const PORT = process.env.PORT || 8080;

// Serve openAPI
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Middleware
app.use(express.json());
// app.use('/api/v1/availabilityProfile/', tokenChecker);

// Routes
app.use('/api/v1/students', studentsRouter);
app.use('/api/v1/employees', employeesRouter);
app.use('/api/v1/login', login);
app.use('/api/v1/skills', skillsRouter);
app.use('/api/v1/educations', educationsRouter);
app.use('/api/v1/verify-email', verifyEmail);
// app.use('/ap1/v1/availabilityProfile', AvailabilityProfileRouter);

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
app.listen(PORT, () => {
    console.log(`🚀 WannaWork API in esecuzione su porta ${PORT}`);
    console.log(`📍 URL locale: http://localhost:${PORT}/api/v1`);
});
