/**
 * insightsRoutes.js — Pattern-Based Productivity Analytics route
 *
 * Google Technology: MongoDB aggregation pipelines feed into Gemini prompt
 * for personalized agent tick suggestions.
 */

import express from 'express';
import { getProductivityInsights } from '../controllers/insightsController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/insights — returns aggregated productivity patterns
router.get('/', requireAuth, getProductivityInsights);

export default router;
