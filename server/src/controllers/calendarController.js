/**
 * calendarController.js — Google Calendar OAuth2 Flow & Event API
 *
 * Google Technology: Google Calendar API via googleapis
 * OAuth 2.0 Authorization Code flow:
 *   1. GET /api/calendar/auth-url  → redirect user to Google consent screen
 *   2. GET /api/calendar/callback  → exchange code for tokens, encrypt & store
 *   3. GET /api/calendar/events    → fetch upcoming events for agent context
 *   4. GET /api/calendar/status    → check if user has connected calendar
 *   5. DELETE /api/calendar/disconnect → revoke & remove stored tokens
 *
 * Security:
 *   - Tokens encrypted AES-256-CBC before DB write (calendarService.js)
 *   - State parameter carries userId to prevent CSRF on callback
 *   - Raw tokens are NEVER logged or returned to the client
 */

import { User } from '../models/User.js';
import {
  getCalendarAuthUrl,
  exchangeCodeForTokens,
  fetchCalendarEvents,
} from '../services/calendarService.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { config } from '../../config/index.js';

// ─── GET AUTH URL ─────────────────────────────────────────────────────────────
/**
 * GET /api/calendar/auth-url
 * Returns the Google OAuth consent URL.
 * Client redirects the user to this URL.
 */
export const getAuthUrl = asyncHandler(async (req, res) => {
  // Pass userId as state so the callback knows which user to update
  const authUrl = getCalendarAuthUrl(req.user._id);

  res.json({
    success: true,
    authUrl,
    note: 'Redirect the user to authUrl to begin the OAuth flow.',
  });
});

// ─── OAUTH CALLBACK ───────────────────────────────────────────────────────────
/**
 * GET /api/calendar/callback
 * Called by Google after user grants permission.
 * Exchanges auth code for tokens, encrypts, and stores in User document.
 * NOTE: This is NOT protected by requireAuth — it's the OAuth callback endpoint.
 *       Security is provided by the `state` parameter (userId) + the code itself.
 */
export const handleOAuthCallback = asyncHandler(async (req, res) => {
  const { code, state: userId, error } = req.query;

  // User denied permission
  if (error) {
    console.warn(`[Calendar] OAuth denied by user ${userId}: ${error}`);
    return res.redirect(`${config.clientUrl}/calendar?error=access_denied`);
  }

  if (!code || !userId) {
    return res.redirect(`${config.clientUrl}/calendar?error=invalid_callback`);
  }

  // Validate userId is a valid ObjectId before DB query
  if (!/^[a-f\d]{24}$/i.test(userId)) {
    return res.redirect(`${config.clientUrl}/calendar?error=invalid_state`);
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.redirect(`${config.clientUrl}/calendar?error=user_not_found`);
  }

  // Exchange code for tokens and encrypt them
  const tokens = await exchangeCodeForTokens(code);

  // Store encrypted tokens in user document
  user.googleCalendar = {
    connected: true,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenExpiry: tokens.tokenExpiry,
    scope: tokens.scope,
    connectedAt: new Date(),
  };

  // Optionally fetch the user's Google email for display
  try {
    const { google } = await import('googleapis');
    const { createOAuth2Client, decryptToken } = await import('../services/calendarService.js');
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: decryptToken(tokens.accessToken) });
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const info = await oauth2.userinfo.get();
    user.googleCalendar.connectedEmail = info.data.email || user.email;
  } catch (emailErr) {
    console.warn('[Calendar] Could not fetch Google account email:', emailErr.message);
    user.googleCalendar.connectedEmail = user.email; // fallback to registration email
  }

  await user.save();

  console.log(`[Calendar] User ${user.email} successfully connected Google Calendar`);

  // Redirect back to the calendar page in the app with success flag
  res.redirect(`${config.clientUrl}/calendar?connected=true`);
});

// ─── GET CALENDAR STATUS ──────────────────────────────────────────────────────
/**
 * GET /api/calendar/status
 * Returns whether the authenticated user has connected their Google Calendar.
 */
export const getCalendarStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('googleCalendar');

  res.json({
    success: true,
    connected: user?.googleCalendar?.connected || false,
    connectedEmail: user?.googleCalendar?.connectedEmail || null,
    connectedAt: user?.googleCalendar?.connectedAt || null,
  });
});

// ─── GET CALENDAR EVENTS ──────────────────────────────────────────────────────
/**
 * GET /api/calendar/events?daysAhead=7
 * Fetches upcoming Google Calendar events for the authenticated user.
 * Returns simplified event list for agent context injection.
 *
 * Google Technology: Google Calendar API — real scheduling context for agent
 */
export const getEvents = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('googleCalendar');

  if (!user?.googleCalendar?.connected) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'CALENDAR_NOT_CONNECTED',
        message: 'Google Calendar is not connected. Visit /calendar to connect.',
      },
    });
  }

  const daysAhead = Math.min(parseInt(req.query.daysAhead || '7', 10), 30);

  try {
    const events = await fetchCalendarEvents(user.googleCalendar, daysAhead);
    res.json({
      success: true,
      count: events.length,
      daysAhead,
      events,
    });
  } catch (err) {
    console.error('[Calendar] Error fetching events:', err.message);
    if (err.message?.toLowerCase().includes('scope') || err.message?.toLowerCase().includes('insufficient') || err.code === 403 || err.status === 403) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCOPES',
          message: 'Google Calendar access was not fully authorized. Please click "Disconnect", then click "Connect Google Calendar" again, making sure to CHECK the checkbox to grant Google Calendar access when signing in.',
        },
      });
    }
    throw err;
  }
});

// ─── DISCONNECT CALENDAR ──────────────────────────────────────────────────────
/**
 * DELETE /api/calendar/disconnect
 * Removes stored tokens and marks calendar as disconnected.
 * Does NOT revoke the Google token (requires an extra API call; user can
 * revoke from their Google Account settings).
 */
export const disconnectCalendar = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      'googleCalendar.connected': false,
      'googleCalendar.accessToken': null,
      'googleCalendar.refreshToken': null,
      'googleCalendar.tokenExpiry': null,
      'googleCalendar.connectedEmail': null,
    },
  });

  console.log(`[Calendar] User ${req.user.email} disconnected Google Calendar`);

  res.json({
    success: true,
    message: 'Google Calendar disconnected. Tokens removed from database.',
  });
});
