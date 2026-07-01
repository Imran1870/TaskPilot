import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { config } from '../../config/index.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';

// Helper to hash tokens using fast secure SHA-256
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Helper to generate access and refresh tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, config.jwtAccessSecret, {
    expiresIn: '15m',
  });
  const refreshToken = jwt.sign({ userId }, config.jwtRefreshSecret, {
    expiresIn: '7d',
  });
  return { accessToken, refreshToken };
};

// Set refresh token in HTTP-only cookie
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production', // true in production
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/auth' // Only send to auth endpoints to minimize exposure
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, timezone, notificationPreferences } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Hash password using bcrypt (cost factor 12)
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // Generate tokens
  const user = await User.create({
    name,
    email,
    passwordHash,
    timezone,
    notificationPreferences,
  });

  const { accessToken, refreshToken } = generateTokens(user._id);

  // Store SHA-256 hash of refresh token
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  // Set HTTP-only cookie
  setRefreshTokenCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      notificationPreferences: user.notificationPreferences,
    },
    accessToken,
  });
});

// @desc    Auth user & get token (login)
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Generic message error to prevent leaking whether email exists
  const authError = new Error('Invalid email or password');
  authError.code = 'UNAUTHORIZED';

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401);
    throw authError;
  }

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    res.status(401);
    throw authError;
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Store SHA-256 hash of refresh token
  user.refreshTokenHash = hashToken(refreshToken);
  user.lastLoginAt = new Date();
  await user.save();

  // Set cookie
  setRefreshTokenCookie(res, refreshToken);

  res.json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      notificationPreferences: user.notificationPreferences,
    },
    accessToken,
  });
});

// @desc    Refresh access token (Rotate refresh tokens)
// @route   POST /api/auth/refresh
// @access  Public
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res.status(401);
    const error = new Error('Refresh token not found');
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  try {
    // Verify refresh token signature
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || !user.refreshTokenHash) {
      res.status(401);
      const error = new Error('Session not found');
      error.code = 'UNAUTHORIZED';
      throw error;
    }

    // Hash incoming refresh token and compare to stored hash
    const incomingHash = hashToken(refreshToken);
    if (user.refreshTokenHash !== incomingHash) {
      // Potential token reuse detected! Clear hash for security
      user.refreshTokenHash = null;
      await user.save();
      
      res.clearCookie('refreshToken', { path: '/api/auth' });
      res.status(401);
      const error = new Error('Session compromised or invalid');
      error.code = 'UNAUTHORIZED';
      throw error;
    }

    // Generate new tokens (Rotation)
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Save hash of new refresh token
    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save();

    // Set new cookie
    setRefreshTokenCookie(res, newRefreshToken);

    res.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (err) {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.status(401);
    const error = new Error('Session expired or invalid');
    error.code = 'UNAUTHORIZED';
    throw error;
  }
});

// @desc    Logout user & invalidate tokens
// @route   POST /api/auth/logout
// @access  Public (so we can clear cookie even if access token is already expired)
export const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
      const user = await User.findById(decoded.userId);
      if (user) {
        // Invalidate stored refresh token
        user.refreshTokenHash = null;
        await user.save();
      }
    } catch (err) {
      // If token expired/invalid, we just continue cleaning cookie
    }
  }

  // Clear cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/api/auth'
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

