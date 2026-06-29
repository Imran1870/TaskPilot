import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.[\w]{2,3})+$/,
      'Please fill a valid email address',
    ],
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required'],
  },
  timezone: {
    type: String,
    default: 'UTC',
  },
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true,
    },
    push: {
      type: Boolean,
      default: true,
    },
  },
  refreshTokenHash: {
    type: String,
    default: null,
  },
  // ── Phase 4: Google Calendar Integration ─────────────────────────────────────
  // Tokens are stored AES-256-CBC encrypted (see calendarService.js).
  // Production recommendation: use Google Secret Manager / Cloud KMS instead of
  // a config-file-derived key.
  googleCalendar: {
    connected: {
      type: Boolean,
      default: false,
    },
    // AES-256-CBC encrypted access token
    accessToken: {
      type: String,
      default: null,
    },
    // AES-256-CBC encrypted refresh token (long-lived, kept for auto-refresh)
    refreshToken: {
      type: String,
      default: null,
    },
    tokenExpiry: {
      type: Date,
      default: null,
    },
    // Which scopes were granted by the user
    scope: {
      type: String,
      default: null,
    },
    // Google account email that was connected (for display in UI)
    connectedEmail: {
      type: String,
      default: null,
    },
    connectedAt: {
      type: Date,
      default: null,
    },
  },
  pushSubscription: {
    endpoint: { type: String, default: null },
    keys: {
      p256dh: { type: String, default: null },
      auth: { type: String, default: null },
    },
  },
}, {
  timestamps: true,
});

export const User = mongoose.model('User', userSchema);
