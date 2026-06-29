/**
 * habitController.js — Habit & Goal Tracking with Agent Tie-in
 *
 * Feature 4: HABIT/GOAL TRACKING
 * Full CRUD for habits with streak tracking.
 * Tied into the agent tick loop — NOT a bolted-on separate feature.
 * The agent proactively nudges before a streak breaks (context-aware).
 */

import { HabitGoal } from '../models/HabitGoal.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { z } from 'zod';

const habitSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  targetFrequency: z.enum(['daily', '3x_week', '5x_week', 'weekdays', 'weekends', 'custom']),
  category: z.enum(['fitness', 'learning', 'mindfulness', 'productivity', 'health', 'social', 'other']).default('other'),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  agentNudgeEnabled: z.boolean().default(true),
  targetDays: z.array(z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])).optional(),
});

// ─── LIST HABITS ─────────────────────────────────────────────────────────────
export const getHabits = asyncHandler(async (req, res) => {
  const habits = await HabitGoal.find({ owner: req.user._id }).sort({ streakCount: -1, title: 1 });

  // Enrich with today's completion status
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const enriched = habits.map((h) => {
    const completedToday = h.completionLog?.some((date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }) || false;

    const lastCompleted = h.lastCompletedAt ? new Date(h.lastCompletedAt) : null;
    const daysSinceLastCompleted = lastCompleted
      ? Math.floor((Date.now() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const streakAtRisk = !completedToday && daysSinceLastCompleted !== null && daysSinceLastCompleted >= 1;

    return {
      ...h.toObject(),
      completedToday,
      streakAtRisk,
      daysSinceLastCompleted,
    };
  });

  res.json({ success: true, habits: enriched });
});

// ─── CREATE HABIT ─────────────────────────────────────────────────────────────
export const createHabit = asyncHandler(async (req, res) => {
  const parsed = habitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400);
    throw new Error(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const habit = await HabitGoal.create({
    owner: req.user._id,
    ...parsed.data,
    completionLog: [],
    streakCount: 0,
  });

  res.status(201).json({ success: true, habit });
});

// ─── UPDATE HABIT ─────────────────────────────────────────────────────────────
export const updateHabit = asyncHandler(async (req, res) => {
  const parsed = habitSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400);
    throw new Error(parsed.error.errors.map((e) => e.message).join(', '));
  }

  const habit = await HabitGoal.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { $set: parsed.data },
    { new: true },
  );

  if (!habit) {
    res.status(404);
    throw new Error('Habit not found');
  }

  res.json({ success: true, habit });
});

// ─── DELETE HABIT ─────────────────────────────────────────────────────────────
export const deleteHabit = asyncHandler(async (req, res) => {
  const habit = await HabitGoal.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!habit) {
    res.status(404);
    throw new Error('Habit not found');
  }
  res.json({ success: true, message: 'Habit deleted' });
});

// ─── COMPLETE HABIT TODAY ────────────────────────────────────────────────────
/**
 * POST /api/habits/:id/complete
 * Marks today as completed, updates streak intelligently.
 * Streak logic:
 *   - If last completed yesterday → increment streak
 *   - If last completed today → idempotent (already done)
 *   - If gap > 1 day → reset streak to 1
 */
export const completeHabitToday = asyncHandler(async (req, res) => {
  const habit = await HabitGoal.findOne({ _id: req.params.id, owner: req.user._id });
  if (!habit) {
    res.status(404);
    throw new Error('Habit not found');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  // Check if already completed today
  const alreadyDone = habit.completionLog?.some((date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === todayMs;
  });

  if (alreadyDone) {
    return res.json({ success: true, message: 'Already completed today!', habit, streakUpdated: false });
  }

  const lastCompleted = habit.lastCompletedAt ? new Date(habit.lastCompletedAt) : null;
  let newStreak = habit.streakCount;

  if (lastCompleted) {
    const lastDay = new Date(lastCompleted);
    lastDay.setHours(0, 0, 0, 0);
    const dayGap = Math.floor((todayMs - lastDay.getTime()) / (1000 * 60 * 60 * 24));

    if (dayGap === 1) {
      newStreak = habit.streakCount + 1; // continued streak
    } else if (dayGap === 0) {
      newStreak = habit.streakCount; // same day (shouldn't reach here but guard)
    } else {
      newStreak = 1; // streak broken, restart
    }
  } else {
    newStreak = 1; // first completion
  }

  habit.completionLog = habit.completionLog || [];
  habit.completionLog.push(new Date());
  habit.lastCompletedAt = new Date();
  habit.streakCount = newStreak;

  await habit.save();

  res.json({
    success: true,
    message: newStreak > 1 ? `🔥 ${newStreak}-day streak! Keep it up!` : 'Great start! Habit logged.',
    habit,
    streakUpdated: true,
    newStreak,
  });
});

// ─── GET AT-RISK HABITS ────────────────────────────────────────────────────
/**
 * GET /api/habits/at-risk
 * Returns habits that have a streak > 0 but haven't been completed today.
 * Called by the agent tick to generate context-aware nudges.
 */
export const getAtRiskHabits = asyncHandler(async (req, res) => {
  const habits = await HabitGoal.find({
    owner: req.user._id,
    streakCount: { $gt: 0 },
    agentNudgeEnabled: true,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const atRisk = habits.filter((h) => {
    const completedToday = h.completionLog?.some((date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    return !completedToday;
  });

  res.json({ success: true, atRisk });
});
