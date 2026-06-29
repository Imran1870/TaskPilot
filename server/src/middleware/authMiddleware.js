import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../../config/index.js';
import { User } from '../models/User.js';
import { asyncHandler } from './errorMiddleware.js';

// Protect routes - requires verified JWT in Authorization header
export const requireAuth = asyncHandler(async (req, res, next) => {
  let token;
  
  // Read token from Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    const error = new Error('Not authorized, no token provided');
    error.code = 'UNAUTHORIZED';
    return next(error);
  }

  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret);
    const user = await User.findById(decoded.userId).select('-passwordHash -refreshTokenHash');
    
    if (!user) {
      res.status(401);
      const error = new Error('User not found or session invalid');
      error.code = 'UNAUTHORIZED';
      return next(error);
    }
    
    // Attach user payload to request
    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    const error = new Error('Not authorized, token expired or invalid');
    error.code = 'UNAUTHORIZED';
    return next(error);
  }
});

// Login Rate Limiter: max 100 attempts per 15 minutes per IP (increased for dev testing)
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Please try again after 15 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General Auth Rate Limiter (registration, refresh, logouts): max 200 requests per 15 minutes per IP (increased for dev testing)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many authentication requests. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI Rate Limiter (for Gemini requests): max 10 requests per minute per user/IP
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'AI request limit reached. Please wait a minute.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});
