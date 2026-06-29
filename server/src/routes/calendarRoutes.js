/**
 * calendarRoutes.js — Google Calendar OAuth2 + Event routes
 *
 * Google Technology: Google Calendar API
 *
 * Note: /api/calendar/callback is intentionally NOT protected by requireAuth
 * because it's the OAuth2 redirect target from Google (no JWT cookie yet at
 * this point). Security is maintained via the `state` parameter (userId) and
 * the fact that only Google redirects here.
 */

import express from 'express';
import {
  getAuthUrl,
  handleOAuthCallback,
  getCalendarStatus,
  getEvents,
  disconnectCalendar,
} from '../controllers/calendarController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// OAuth callback — NOT protected by JWT (Google redirects here)
router.get('/callback', handleOAuthCallback);

// All other calendar routes require authentication
router.get('/auth-url', requireAuth, getAuthUrl);
router.get('/status', requireAuth, getCalendarStatus);
router.get('/events', requireAuth, getEvents);
router.delete('/disconnect', requireAuth, disconnectCalendar);

export default router;
