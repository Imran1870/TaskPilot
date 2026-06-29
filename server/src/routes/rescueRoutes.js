/**
 * rescueRoutes.js — Rescue Mode + Communication Assist routes
 *
 * Rate limits:
 *  - Rescue plan: 10/day per user (Gemini-heavy)
 *  - Draft message: 15/day per user
 *  - Reschedule suggestions: 20/day per user
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getRescueEligibleTasks,
  generateTaskRescuePlan,
  draftCommunicationMessage,
  getRescheduleSuggestions,
} from '../controllers/rescueController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// All rescue routes require authentication
router.use(requireAuth);

// Rate limit: rescue plan (Gemini-heavy, 10/day)
const rescuePlanLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Rescue plan limit: 10/day. Resets tomorrow.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit: draft messages (15/day)
const draftLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Draft message limit: 15/day. Resets tomorrow.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/rescue/eligible — tasks qualifying for rescue mode
router.get('/eligible', getRescueEligibleTasks);

// POST /api/rescue/:id/plan — generate Gemini MVP rescue plan
router.post('/:id/plan', rescuePlanLimiter, generateTaskRescuePlan);

// POST /api/rescue/:id/draft-message — draft extension/delay message
router.post('/:id/draft-message', draftLimiter, draftCommunicationMessage);

// POST /api/rescue/:id/reschedule-suggestions — find deferrable tasks
router.post('/:id/reschedule-suggestions', getRescheduleSuggestions);

export default router;
