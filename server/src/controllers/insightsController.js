/**
 * insightsController.js — Pattern-Based Productivity Analytics
 *
 * Feature 3: PATTERN-BASED PERSONALIZATION
 * Aggregates completion patterns from the Task collection to:
 *  1. Surface insights on the UI ("Your Productivity Patterns" page)
 *  2. Feed into the Gemini prompt for personalized agent suggestions
 */

import { Task } from '../models/Task.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';

// ─── GET PRODUCTIVITY INSIGHTS ───────────────────────────────────────────────
/**
 * GET /api/insights
 * Runs aggregation pipelines on the user's Task history.
 * Returns patterns used for the UI and injected into agent tick prompts.
 */
export const getProductivityInsights = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ── 1. Time Estimation Accuracy by Category ────────────────────────────────
  const estimationAccuracy = await Task.aggregate([
    {
      $match: {
        owner: userId,
        status: 'done',
        estimatedMinutes: { $gt: 0 },
        'aiMeta.actualMinutes': { $exists: true, $gt: 0 },
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: '$category',
        avgEstimated: { $avg: '$estimatedMinutes' },
        avgActual: { $avg: '$aiMeta.actualMinutes' },
        taskCount: { $sum: 1 },
      },
    },
    {
      $project: {
        category: '$_id',
        avgEstimated: { $round: ['$avgEstimated', 0] },
        avgActual: { $round: ['$avgActual', 0] },
        taskCount: 1,
        underestimatePercent: {
          $round: [
            {
              $multiply: [
                { $divide: [{ $subtract: ['$avgActual', '$avgEstimated'] }, '$avgEstimated'] },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { underestimatePercent: -1 } },
  ]);

  // ── 2. Procrastination Score by Category ──────────────────────────────────
  // Measure: how long between task creation and first status change to in-progress
  const procrastinationData = await Task.aggregate([
    {
      $match: {
        owner: userId,
        status: { $in: ['done', 'in-progress', 'missed'] },
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: '$category',
        avgDaysToStart: {
          $avg: {
            $divide: [
              { $subtract: ['$updatedAt', '$createdAt'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
        taskCount: { $sum: 1 },
      },
    },
    {
      $project: {
        category: '$_id',
        avgDaysToStart: { $round: ['$avgDaysToStart', 1] },
        taskCount: 1,
      },
    },
    { $sort: { avgDaysToStart: -1 } },
  ]);

  // ── 3. Miss Rate by Priority ───────────────────────────────────────────────
  const missRateData = await Task.aggregate([
    {
      $match: {
        owner: userId,
        status: { $in: ['done', 'missed'] },
        createdAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: '$priority',
        total: { $sum: 1 },
        missed: { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } },
      },
    },
    {
      $project: {
        priority: '$_id',
        total: 1,
        missed: 1,
        missRate: {
          $round: [{ $multiply: [{ $divide: ['$missed', '$total'] }, 100] }, 0],
        },
      },
    },
    { $sort: { missRate: -1 } },
  ]);

  // ── 4. Overall Stats ───────────────────────────────────────────────────────
  const totalCompleted = await Task.countDocuments({ owner: userId, status: 'done' });
  const totalMissed = await Task.countDocuments({ owner: userId, status: 'missed' });
  const totalActive = await Task.countDocuments({
    owner: userId,
    status: { $in: ['pending', 'in-progress'] },
    deletedAt: null,
  });
  const overallMissRate = totalCompleted + totalMissed > 0
    ? Math.round((totalMissed / (totalCompleted + totalMissed)) * 100)
    : 0;

  // ── 5. Build Agent-Consumable Pattern Summary ──────────────────────────────
  const procrastinationCategories = procrastinationData
    .filter((p) => p.avgDaysToStart > 1)
    .map((p) => p.category);

  const worstEstimationCategory = estimationAccuracy.find((e) => e.underestimatePercent > 20);

  const patternSummary = {
    procrastinationCategories,
    estimationAccuracy: worstEstimationCategory?.underestimatePercent || null,
    worstEstimationCategory: worstEstimationCategory?.category || null,
    missRate: overallMissRate,
    bestFocusHours: ['9-11am', '3-5pm'], // TODO: derive from actual completion timestamps
    totalTasksAnalyzed: totalCompleted + totalMissed,
  };

  res.json({
    success: true,
    insights: {
      estimationAccuracy,
      procrastination: procrastinationData,
      missRates: missRateData,
      overview: {
        totalCompleted,
        totalMissed,
        totalActive,
        overallMissRate,
        dataWindowDays: 30,
      },
    },
    patternSummary, // used by agent tick prompt
  });
});
