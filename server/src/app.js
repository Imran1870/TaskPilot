import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import { config } from '../config/index.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
// ── Phase 4 Routes ──────────────────────────────────────────────────────────
import rescueRoutes from './routes/rescueRoutes.js';
import habitRoutes from './routes/habitRoutes.js';
import insightsRoutes from './routes/insightsRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';

const app = express();

// Set security headers
app.use(helmet());

// Enable CORS with support for credentials (cookies)
app.use(cors({
  origin: [config.clientUrl, 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-agent-secret'],
}));

// Request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sanitize data against NoSQL injection
app.use(mongoSanitize());

// Sanitize data against XSS
app.use(xss());

// Simple healthcheck route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', env: config.nodeEnv });
});

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/agent', agentRoutes);

// Phase 4: Rescue Mode + Communication Assist
app.use('/api/rescue', rescueRoutes);
app.use('/rescue', rescueRoutes);

// Phase 4: Habit Tracking + Agent Tie-in
app.use('/api/habits', habitRoutes);
app.use('/habits', habitRoutes);

// Phase 4: Pattern Personalization Analytics
app.use('/api/insights', insightsRoutes);
app.use('/insights', insightsRoutes);

// Phase 4: Google Calendar Integration (Google Technology)
app.use('/api/calendar', calendarRoutes);
app.use('/calendar', calendarRoutes);

// Unknown route handler
app.use(notFound);

// Global centralized error handler
app.use(errorHandler);

export default app;
