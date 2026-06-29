import express from 'express';
import { 
  registerUser, 
  loginUser, 
  refreshAccessToken, 
  logoutUser,
  getCurrentUser
} from '../controllers/authController.js';
import { validateSchema } from '../middleware/validateMiddleware.js';
import { 
  registerSchema, 
  loginSchema 
} from '../../../shared/schemas.js';
import { 
  loginRateLimiter, 
  authRateLimiter,
  requireAuth
} from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth rate limiting to registration and general operations
router.post('/register', authRateLimiter, validateSchema(registerSchema), registerUser);
router.post('/login', loginRateLimiter, validateSchema(loginSchema), loginUser);
router.post('/refresh', authRateLimiter, refreshAccessToken);
router.post('/logout', authRateLimiter, logoutUser);
router.get('/me', requireAuth, getCurrentUser);

export default router;
