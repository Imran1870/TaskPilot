import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  runAgentTick,
  getAgentLogs,
  getPendingSuggestions,
  approveSuggestion,
  rejectSuggestion,
} from '../controllers/agentController.js';
import { resetCircuitBreaker, getCircuitStatus } from '../services/geminiService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';

const router = express.Router();

// ── /api/agent/tick ──────────────────────────────────────────────────────────
// NOT protected by JWT — uses shared-secret header (called by Cloud Scheduler)
// Authentication is handled inside the controller
router.post('/tick', runAgentTick);

// ── Authenticated agent routes ───────────────────────────────────────────────
router.get('/logs', requireAuth, getAgentLogs);
router.get('/pending-suggestions', requireAuth, getPendingSuggestions);
router.post('/suggestions/:id/approve', requireAuth, approveSuggestion);
router.post('/suggestions/:id/reject', requireAuth, rejectSuggestion);

// ── DEV/Testing: Circuit breaker control ─────────────────────────────────────
// GET /api/agent/circuit-status — returns current circuit breaker state
router.get('/circuit-status', requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, circuit: getCircuitStatus() });
}));

// POST /api/agent/circuit-reset — manually resets the circuit breaker
// In production this would be admin-only; for hackathon demo it's any authed user
router.post('/circuit-reset', requireAuth, asyncHandler(async (req, res) => {
  resetCircuitBreaker();
  res.json({ success: true, message: 'Circuit breaker reset. Next agent tick will call Gemini directly.', circuit: getCircuitStatus() });
}));

// ── Web Push Notification Endpoints ──────────────────────────────────────────
// GET /api/agent/vapid-key — returns the public key
router.get('/vapid-key', requireAuth, asyncHandler(async (req, res) => {
  const { vapidKeys } = await import('../services/notificationService.js');
  res.json({ success: true, publicKey: vapidKeys.publicKey });
}));

// POST /api/agent/subscribe-push — saves user subscription details
router.post('/subscribe-push', requireAuth, asyncHandler(async (req, res) => {
  const { User } = await import('../models/User.js');
  const { subscription } = req.body;
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    res.status(400);
    throw new Error('Invalid subscription payload');
  }
  
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      pushSubscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        }
      }
    }
  });
  
  res.json({ success: true, message: 'Web push subscription registered successfully.' });
}));

export default router;

