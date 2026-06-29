/**
 * habitRoutes.js — Habit & Goal Tracking routes
 */

import express from 'express';
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  completeHabitToday,
  getAtRiskHabits,
} from '../controllers/habitController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// All habit routes require authentication
router.use(requireAuth);

// Static routes first (before :id parameter routes)
router.get('/at-risk', getAtRiskHabits);

router.route('/')
  .get(getHabits)
  .post(createHabit);

router.route('/:id')
  .put(updateHabit)
  .patch(updateHabit)
  .delete(deleteHabit);

router.post('/:id/complete', completeHabitToday);

export default router;
