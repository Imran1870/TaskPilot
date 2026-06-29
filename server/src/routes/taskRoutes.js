import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getCalendarTasks,
  addOrToggleSubtask,
} from '../controllers/taskController.js';
import { aiTaskBreakdown, acceptBreakdown } from '../controllers/agentController.js';
import { parseVoiceInput } from '../controllers/voiceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateSchema } from '../middleware/validateMiddleware.js';
import { taskSchema } from '../../../shared/schemas.js';

// Rate limit AI breakdown: 20 requests/day per user to control Gemini spend
const aiBreakdownLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 20,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'AI breakdown limit: 20 requests per day. Resets tomorrow.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit voice parsing: 30 requests/day per user
const voiceLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Voice capture limit: 30 requests per day. Resets tomorrow.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

// All task routes require authentication
router.use(requireAuth);

// Static/prefixed routes must go BEFORE parameter routes to prevent capture conflict
router.get('/calendar', getCalendarTasks);

// Voice capture — Google Technology: Gemini API (natural language → task)
// POST /api/tasks/parse-voice  (rate limited: 30/day per user)
router.post('/parse-voice', voiceLimiter, parseVoiceInput);

router.route('/')
  .get(getTasks)
  .post(validateSchema(taskSchema), createTask);

router.post('/:id/subtasks', addOrToggleSubtask);

// AI-powered breakdown — rate limited 20/day per user
router.post('/:id/ai-breakdown', aiBreakdownLimiter, aiTaskBreakdown);
router.post('/:id/ai-breakdown/accept', acceptBreakdown);

router.route('/:id')
  .get(getTaskById)
  .put(validateSchema(taskSchema.partial()), updateTask)
  .patch(validateSchema(taskSchema.partial()), updateTask) // support both PUT and PATCH for flexibility
  .delete(deleteTask);

export default router;
