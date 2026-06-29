/**
 * agentController.js — The Autonomous Agent Core
 *
 * Implements the OBSERVE → DECIDE → ACT → LOG loop.
 *
 * Security: /api/agent/tick is protected by a shared-secret header
 * (AGENT_TICK_SECRET) — NOT user JWT, because it's called by Google Cloud
 * Scheduler, not a browser. Any unauthorized call is rejected with 403 and
 * logged for auditing.
 */

import { Task } from '../models/Task.js';
import { AgentLog } from '../models/AgentLog.js';
import { User } from '../models/User.js';
import { HabitGoal } from '../models/HabitGoal.js';
import {
  analyzeTasksWithGemini,
  analyzeTasksWithContext,
  breakdownTaskWithGemini,
  generateNudgeWithGemini,
  generateHabitNudge,
} from '../services/geminiService.js';
import { computeUrgencyScore } from '../../../shared/urgency.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';
import { config } from '../../config/index.js';

// Helper to calculate discrete urgency buckets so passing time updates hashes
const getProximityBucket = (deadline, now, estimatedMinutes) => {
  const minutesLeft = (new Date(deadline) - now) / 60000;
  if (minutesLeft <= estimatedMinutes) return 'critical_deficit';
  if (minutesLeft <= 60) return 'under_1h';
  if (minutesLeft <= 120) return 'under_2h';
  if (minutesLeft <= 480) return 'under_8h';
  if (minutesLeft <= 1440) return 'under_24h';
  if (minutesLeft <= 4320) return 'under_3d';
  if (minutesLeft <= 10080) return 'under_1w';
  return 'long_term';
};

const getRiskTier = (score) => {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

// Helper to calculate content hash for task change detection
const computeTaskHash = (task, now = new Date()) => {
  const subtasksStr = (task.subtasks || []).map(s => `${s.title}:${s.done}`).join(',');
  const deadlineStr = task.deadline ? new Date(task.deadline).toISOString() : '';
  const freshScore = computeUrgencyScore(task, now);
  const proximityBucket = getProximityBucket(task.deadline, now, task.estimatedMinutes || 30);
  const riskTier = getRiskTier(freshScore);

  return [
    task.title || '',
    task.description || '',
    deadlineStr,
    task.priority || '',
    task.category || '',
    task.status || '',
    subtasksStr,
    proximityBucket,
    riskTier
  ].join('|');
};

// Cost guard: max Gemini calls per tick run to prevent runaway spend
const MAX_GEMINI_CALLS_PER_TICK = 20;

// Helper to compile component weights for email diagnostics
const getScoreWeights = (task, timeRemainingMin) => {
  const estimated = task.estimatedMinutes || 30;
  let proximityVal = '';
  let proximityWeight = 0;
  
  if (timeRemainingMin <= estimated) {
    proximityVal = 'Less than estimated effort';
    proximityWeight = 75;
  } else if (timeRemainingMin <= 60) {
    proximityVal = 'Under 1 hour';
    proximityWeight = 65;
  } else if (timeRemainingMin <= 120) {
    proximityVal = 'Under 2 hours';
    proximityWeight = 55;
  } else if (timeRemainingMin <= 480) {
    proximityVal = 'Under 8 hours';
    proximityWeight = 40;
  } else if (timeRemainingMin <= 1440) {
    proximityVal = 'Under 24 hours';
    proximityWeight = 28;
  } else if (timeRemainingMin <= 4320) {
    proximityVal = 'Under 3 days';
    proximityWeight = 18;
  } else if (timeRemainingMin <= 10080) {
    proximityVal = 'Under 1 week';
    proximityWeight = 10;
  } else {
    proximityVal = 'Under 30 days';
    proximityWeight = 3;
  }

  const priorityWeights = { critical: 20, high: 15, medium: 8, low: 0 };
  const priorityWeight = priorityWeights[task.priority] || 0;

  const categoryWeights = { interview: 8, bill: 6, meeting: 5, assignment: 4, personal: 2, other: 0 };
  const categoryWeight = categoryWeights[task.category] || 0;

  let incompleteRatio = 'N/A';
  let subtaskWeight = 0;
  if (task.subtasks && task.subtasks.length > 0) {
    const total = task.subtasks.length;
    const incomplete = task.subtasks.filter(s => !s.done).length;
    incompleteRatio = `${incomplete}/${total} incomplete`;
    if (incomplete > 0) {
      subtaskWeight = Math.round((incomplete / total) * 5);
    }
  }

  return { proximityVal, proximityWeight, priorityWeight, categoryWeight, incompleteRatio, subtaskWeight };
};

// In-memory execution lock to prevent overlapping ticks (e.g. manual click + scheduler overlap)
let isTickRunning = false;

// ─── AGENT TICK ──────────────────────────────────────────────────────────────
/**
 * POST /api/agent/tick
 * Called by Google Cloud Scheduler (or manual trigger for testing).
 * Protected by shared-secret header — NOT user JWT.
 *
 * Flow:
 *  OBSERVE  → Pull tasks approaching deadline or high risk
 *  DECIDE   → Send to Gemini for structured analysis
 *  ACT      → Auto-apply low-risk actions, queue high-risk for user approval
 *  LOG      → Write every decision + reasoning to AgentLog
 */
export const runAgentTick = asyncHandler(async (req, res) => {
  if (isTickRunning) {
    console.warn('[AgentTick] Skipping tick — another tick is currently executing.');
    return res.json({
      success: true,
      message: 'Agent tick already in progress — skipping overlapping run',
      stats: { tasksObserved: 0, usersProcessed: 0, actionsLogged: 0, geminiCallsMade: 0, tickDurationMs: 0 }
    });
  }

  isTickRunning = true;
  try {
    const tickStart = Date.now();

  // ── Security: Validate shared secret ──────────────────────────────────────
  const incomingSecret = req.headers['x-agent-secret'];
  if (!incomingSecret || incomingSecret !== config.agentTickSecret) {
    console.error(`[AgentTick] UNAUTHORIZED access attempt from IP: ${req.ip} at ${new Date().toISOString()}`);
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Invalid or missing agent secret' },
    });
  }

  // ── OBSERVE: Pull tasks needing attention ─────────────────────────────────
  const now = new Date();
  const lookAheadHours = parseInt(req.query.lookAheadHours || '24', 10);
  const lookAheadMs = lookAheadHours * 60 * 60 * 1000;

  // Find tasks: active, not deleted, deadline within look-ahead window
  const tasksToAnalyze = await Task.find({
    status: { $in: ['pending', 'in-progress'] },
    deletedAt: null,
    deadline: { $lte: new Date(now.getTime() + lookAheadMs) },
  }).populate('owner', 'name email timezone pushSubscription').limit(100);

  console.log(`[AgentTick] OBSERVING ${tasksToAnalyze.length} tasks (${lookAheadHours}h window)`);

  if (tasksToAnalyze.length === 0) {
    return res.json({
      success: true,
      message: 'No tasks in observation window — nothing to process',
      tickDurationMs: Date.now() - tickStart,
    });
  }

  // Group tasks by user for context-aware Gemini prompts
  const tasksByUser = {};
  tasksToAnalyze.forEach((task) => {
    const userId = task.owner._id.toString();
    if (!tasksByUser[userId]) {
      tasksByUser[userId] = { user: task.owner, tasks: [] };
    }
    tasksByUser[userId].tasks.push(task);
  });

  const totalLogs = [];
  let totalGeminiCalls = 0;

  // ── DECIDE + ACT: Per-user analysis ──────────────────────────────────────
  for (const [userId, { user, tasks }] of Object.entries(tasksByUser)) {
    if (totalGeminiCalls >= MAX_GEMINI_CALLS_PER_TICK) {
      console.warn(`[AgentTick] Cost guard hit — skipping remaining users after ${totalGeminiCalls} calls`);
      break;
    }

    const isForce = req.query.force === 'true';

    console.log(`[AgentTick] Analyzing ${tasks.length} tasks for user ${user.name}`);
    
    // ── Pre-process: Update Risk Scores & Process Notifications for ALL tasks ──
    for (const task of tasks) {
      const freshScore = computeUrgencyScore(task, now);
      task.aiMeta = task.aiMeta || {};
      task.aiMeta.riskScore = freshScore;
      task.aiMeta.lastEvaluatedAt = now;
      
      // Update database risk score immediately
      await Task.findByIdAndUpdate(task._id, {
        $set: {
          'aiMeta.riskScore': freshScore,
          'aiMeta.lastEvaluatedAt': now
        }
      });
      
      // Evaluate notifications
      const timeRemainingMin = (new Date(task.deadline) - now) / 60000;
      const estimated = task.estimatedMinutes || 30;
      const currentNotificationState = task.aiMeta.notificationSent || 'none';

      if (timeRemainingMin > 0) {
        // Non-critical: priority is not critical AND (duration > deadline timeleft OR deadline is in next 4 hours)
        const isNonCriticalAlert = 
          task.priority !== 'critical' && 
          (estimated > timeRemainingMin || timeRemainingMin <= 240);

        // Critical: priority is critical AND (currtime + duration of work + 2hr > deadline)
        const isCriticalAlert = 
          task.priority === 'critical' &&
          (now.getTime() + estimated * 60000 + 2 * 60 * 60 * 1000 > new Date(task.deadline).getTime());

        const alreadySentPush = currentNotificationState === 'push_only' || currentNotificationState === 'email_and_push';
        const alreadySentEmail = currentNotificationState === 'email_and_push';

        if (isNonCriticalAlert && (!alreadySentPush || isForce)) {
          // Send Push Notification ONLY
          try {
            if (user.pushSubscription?.endpoint) {
              const { sendWebPushNotification } = await import('../services/notificationService.js');
              await sendWebPushNotification(user.pushSubscription, {
                title: `⚠️ Task Warning: ${task.title}`,
                body: `Task is due soon (${Math.round(timeRemainingMin)}m left). Priority is ${task.priority}.`,
                url: '/dashboard'
              });
            }
            // Update database
            await Task.findByIdAndUpdate(task._id, { $set: { 'aiMeta.notificationSent': 'push_only' } });
            task.aiMeta.notificationSent = 'push_only';
            console.log(`[Notification] Sent near-deadline push alert for: "${task.title}"`);
          } catch (notiErr) {
            console.error('[Notification] Error sending push warning:', notiErr.message);
          }
        } else if (isCriticalAlert && (!alreadySentEmail || isForce)) {
          // Send Email + Push Notification
          try {
            const { sendCriticalTaskEmail, sendWebPushNotification } = await import('../services/notificationService.js');

            await sendCriticalTaskEmail(
              user.email,
              task.title,
              new Date(task.deadline).toLocaleString(),
              `${estimated} minutes`
            );

            // Send browser push notification if subscription exists
            if (user.pushSubscription?.endpoint) {
              await sendWebPushNotification(user.pushSubscription, {
                title: `🚨 Critical Alert: ${task.title}`,
                body: `Task is approaching its deadline. Estimated duration: ${estimated}m.`,
                url: '/dashboard'
              });
            }

            // Update database notification tracking state
            await Task.findByIdAndUpdate(task._id, { $set: { 'aiMeta.notificationSent': 'email_and_push' } });
            task.aiMeta.notificationSent = 'email_and_push';
            console.log(`[Notification] Sent critical alert (email+push) for: "${task.title}"`);
          } catch (notiErr) {
            console.error('[Notification] Error sending critical notification:', notiErr.message);
          }
        }
      }
    }

    // ── Check if Gemini calls are needed (Optimized Skip Guard) ──────────────
    let hasTaskChanges = false;
    for (const task of tasks) {
      const currentHash = computeTaskHash(task, now);
      if (!task.aiMeta?.contentHash || task.aiMeta.contentHash !== currentHash || !task.aiMeta?.lastEvaluatedAt) {
        hasTaskChanges = true;
        break;
      }
    }

    let habitsNeedingNudge = [];
    let hasHabitChanges = false;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const atRiskHabits = await HabitGoal.find({
        owner: user._id,
        streakCount: { $gt: 0 },
        agentNudgeEnabled: true,
        isArchived: false,
      });

      const filterHabits = atRiskHabits.filter((h) => {
        const completedToday = h.completionLog?.some((date) => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          return d.getTime() === today.getTime();
        });
        return !completedToday;
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const recentNudges = await AgentLog.find({
        user: user._id,
        actionType: 'nudge_sent',
        createdAt: { $gte: todayStart }
      });

      if (isForce) {
        habitsNeedingNudge = filterHabits;
      } else {
        habitsNeedingNudge = filterHabits.filter(h => {
          const alreadyNudgedToday = recentNudges.some(rn => rn.reasoning && rn.reasoning.includes(h.title));
          return !alreadyNudgedToday;
        });
      }
      
      hasHabitChanges = habitsNeedingNudge.length > 0;
    } catch (habitErr) {
      console.warn(`[AgentTick] Habit guard check failed for user ${user.name}:`, habitErr.message);
    }

    if (!isForce && !hasTaskChanges && !hasHabitChanges) {
      console.log(`[AgentTick] Skip guard triggered: No task or habit changes for user ${user.name}. Skipping Gemini.`);
      const savedLog = await AgentLog.create({
        user: user._id,
        relatedTask: null,
        actionType: 'risk_updated',
        reasoning: "Autonomous check: no changes detected in task or habit data since last evaluation.",
        source: 'deterministic_fallback',
        autoApplied: true,
        isPendingSuggestion: false,
        wasAccepted: true,
        geminiTokensUsed: 0
      });
      totalLogs.push(savedLog._id);

      for (const task of tasks) {
        await Task.findByIdAndUpdate(task._id, {
          $set: { 'aiMeta.lastEvaluatedAt': now }
        });
      }
      continue; // Skip task analysis & habit nudges for this user
    }

    // Since we will call Gemini for task analysis, increment the counter
    totalGeminiCalls++;

    // ── OBSERVE Phase 4: Pull user patterns + calendar context ──────────────
    let userPatterns = null;
    let calendarEvents = [];

    try {
      // Fetch productivity patterns from aggregation (Pattern Personalization)
      const { getProductivityInsights } = await import('./insightsController.js');
      // Direct DB aggregation call (skip HTTP layer)
      const { Task: TaskModel } = await import('../models/Task.js');
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const procrastinationData = await TaskModel.aggregate([
        { $match: { owner: user._id, status: { $in: ['done', 'in-progress', 'missed'] }, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$category', avgDaysToStart: { $avg: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 1000 * 60 * 60 * 24] } }, taskCount: { $sum: 1 } } },
        { $project: { category: '$_id', avgDaysToStart: { $round: ['$avgDaysToStart', 1] }, taskCount: 1 } },
      ]);

      const totalCompleted = await TaskModel.countDocuments({ owner: user._id, status: 'done' });
      const totalMissed = await TaskModel.countDocuments({ owner: user._id, status: 'missed' });
      const missRate = totalCompleted + totalMissed > 0
        ? Math.round((totalMissed / (totalCompleted + totalMissed)) * 100) : 0;

      userPatterns = {
        procrastinationCategories: procrastinationData.filter(p => p.avgDaysToStart > 1).map(p => p.category),
        missRate,
        bestFocusHours: ['9-11am', '3-5pm'],
        totalTasksAnalyzed: totalCompleted + totalMissed,
      };
      console.log(`[AgentTick] Pattern context loaded for user ${user.name}: ${missRate}% miss rate`);
    } catch (patternErr) {
      console.warn(`[AgentTick] Could not load patterns for ${user.name}:`, patternErr.message);
    }

    try {
      // Fetch Google Calendar events if user has connected it
      const fullUser = await User.findById(user._id).select('googleCalendar');
      if (fullUser?.googleCalendar?.connected) {
        const { fetchCalendarEvents } = await import('../services/calendarService.js');
        calendarEvents = await fetchCalendarEvents(fullUser.googleCalendar, 2);
        console.log(`[AgentTick] Calendar context: ${calendarEvents.length} events for ${user.name}`);
      }
    } catch (calErr) {
      console.warn(`[AgentTick] Calendar fetch failed for ${user.name}:`, calErr.message);
    }

    // ── DECIDE: Context-aware Gemini analysis (Phase 4 upgrade) ─────────────
    // Uses analyzeTasksWithContext if patterns/calendar available, falls back to basic
    let analysisResult;
    if (userPatterns || calendarEvents.length > 0) {
      analysisResult = await analyzeTasksWithContext(tasks, {
        name: user.name,
        timezone: user.timezone,
      }, userPatterns, calendarEvents);
      console.log(`[AgentTick] Used context-aware analysis for ${user.name}`);
    } else {
      analysisResult = await analyzeTasksWithGemini(tasks, {
        name: user.name,
        timezone: user.timezone,
      });
    }

    // ── ACT: Execute each recommended action ─────────────────────────────────
    for (const action of analysisResult.actions) {
      const task = tasks.find((t) => t._id.toString() === action.taskId);
      if (!task) continue;

      const logEntry = {
        user: userId,
        relatedTask: task._id,
        actionType: action.actionType,
        reasoning: action.reasoning,
        nudgeMessage: action.nudgeMessage || null,
        suggestedChange: action.suggestedChange,
        source: analysisResult.degraded ? 'deterministic_fallback' : 'gemini',
        geminiTokensUsed: Math.round((analysisResult.estimatedTokens || 0) / (analysisResult.actions.length || 1)),
      };

      if (action.riskLevel === 'low') {
        // ── AUTO-APPLY low-risk actions ──────────────────────────────────────
        logEntry.autoApplied = true;
        logEntry.isPendingSuggestion = false;
        logEntry.wasAccepted = true;

        try {
          // Apply the suggested change to the task
          let changeDesc = [];
          if (action.suggestedChange && Object.keys(action.suggestedChange).length > 0) {
            const updateOps = {};
            // Only allow safe field updates — whitelist approach
            const allowedAutoFields = [
              'priority', 'status', 'aiMeta.riskScore', 'aiMeta.lastReasoning', 'aiMeta.lastEvaluatedAt',
            ];
            for (const [field, value] of Object.entries(action.suggestedChange)) {
              if (allowedAutoFields.includes(field)) {
                updateOps[field] = value;
                let shortField = field.startsWith('aiMeta.') ? field.split('.')[1] : field;
                changeDesc.push(`${shortField} set to "${value}"`);
              }
            }
            if (Object.keys(updateOps).length > 0) {
              updateOps['aiMeta.lastEvaluatedAt'] = now;
              updateOps['aiMeta.lastReasoning'] = action.reasoning;
              await Task.findByIdAndUpdate(task._id, { $set: updateOps });
            }
          }

          if (changeDesc.length > 0) {
            logEntry.reasoning = `[Auto-Applied: ${changeDesc.join(', ')}] ${action.reasoning}`;
          } else {
            logEntry.reasoning = `[Auto-Applied] ${action.reasoning}`;
          }

          // Risk score was already updated in the preprocessing loop above.

        } catch (applyErr) {
          console.error(`[AgentTick] Failed to auto-apply action for task ${task._id}:`, applyErr.message);
          logEntry.reasoning += ` [AUTO-APPLY FAILED: ${applyErr.message}]`;
        }

      } else {
        // ── QUEUE high-risk as pending suggestion ────────────────────────────
        logEntry.autoApplied = false;
        logEntry.isPendingSuggestion = true;
        logEntry.wasAccepted = null; // awaiting user decision
      }

      const savedLog = await AgentLog.create(logEntry);
      totalLogs.push(savedLog._id);
    }

    // ── ACT Phase 4: Habit nudges ─────────────────────────────────────────────
    // Reuses habitsNeedingNudge calculated in the skip guard/force check above
    try {
      for (const habit of habitsNeedingNudge) {
        if (totalGeminiCalls >= MAX_GEMINI_CALLS_PER_TICK) break;

        const nudgeMsg = await generateHabitNudge(habit, { name: user.name });
        totalGeminiCalls++;

        await AgentLog.create({
          user: user._id,
          relatedTask: null,
          actionType: 'nudge_sent',
          reasoning: `Habit streak at risk: "${habit.title}" (${habit.streakCount}-day streak, not completed today). Nudge sent to preserve streak.`,
          nudgeMessage: nudgeMsg,
          source: 'gemini',
          autoApplied: true,
          isPendingSuggestion: false,
          wasAccepted: true,
          geminiTokensUsed: 50, // estimated
        });

        console.log(`[AgentTick] Habit nudge sent for "${habit.title}" (${habit.streakCount}-day streak)`);
      }
    } catch (habitErr) {
      console.warn(`[AgentTick] Habit nudge failed for user ${user.name}:`, habitErr.message);
    }

    // ── Update Content Hash & Evaluated Timestamp for all tasks analyzed ──────
    for (const task of tasks) {
      const currentHash = computeTaskHash(task, now);
      await Task.findByIdAndUpdate(task._id, {
        $set: {
          'aiMeta.contentHash': currentHash,
          'aiMeta.lastEvaluatedAt': now
        }
      });
    }
  }

    const tickDurationMs = Date.now() - tickStart;
    console.log(`[AgentTick] COMPLETE — ${totalLogs.length} log entries, ${totalGeminiCalls} Gemini calls, ${tickDurationMs}ms`);

    res.json({
      success: true,
      message: `Agent tick completed`,
      stats: {
        tasksObserved: tasksToAnalyze.length,
        usersProcessed: Object.keys(tasksByUser).length,
        actionsLogged: totalLogs.length,
        geminiCallsMade: totalGeminiCalls,
        tickDurationMs,
      },
    });
  } finally {
    isTickRunning = false;
  }
});

// ─── GET AGENT LOGS ──────────────────────────────────────────────────────────
/**
 * GET /api/agent/logs
 * Returns the authenticated user's agent history (paginated).
 * Powers the "Your AI Assistant" transparency panel on the dashboard.
 */
export const getAgentLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, actionType } = req.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(parseInt(limit, 10) || 10, 50);

  // Build filter — optional actionType param for targeted queries (e.g. nudge_sent)
  const filter = { user: req.user._id, isPendingSuggestion: false };
  if (actionType) filter.actionType = actionType;

  const total = await AgentLog.countDocuments(filter);

  const logs = await AgentLog.find(filter)
    .populate('relatedTask', 'title deadline priority category')
    .sort({ timestamp: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.json({
    success: true,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    logs,
  });
});

// ─── GET PENDING SUGGESTIONS ─────────────────────────────────────────────────
/**
 * GET /api/agent/pending-suggestions
 * Returns high-impact agent suggestions awaiting user approval.
 */
export const getPendingSuggestions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(parseInt(limit, 10) || 10, 50);

  const total = await AgentLog.countDocuments({
    user: req.user._id,
    isPendingSuggestion: true,
    wasAccepted: null,
  });

  const suggestions = await AgentLog.find({
    user: req.user._id,
    isPendingSuggestion: true,
    wasAccepted: null,
  })
    .populate('relatedTask', 'title deadline priority category status')
    .sort({ timestamp: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  res.json({
    success: true,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    suggestions,
  });
});

// ─── APPROVE SUGGESTION ──────────────────────────────────────────────────────
/**
 * POST /api/agent/suggestions/:id/approve
 * User approves a high-impact pending suggestion — agent applies the change.
 */
export const approveSuggestion = asyncHandler(async (req, res) => {
  const suggestion = await AgentLog.findOne({
    _id: req.params.id,
    user: req.user._id,
    isPendingSuggestion: true,
    wasAccepted: null,
  }).populate('relatedTask');

  if (!suggestion) {
    res.status(404);
    throw new Error('Suggestion not found or already resolved');
  }

  // Apply the suggested change (user approved — all field changes are safe here)
  if (suggestion.relatedTask && suggestion.suggestedChange) {
    const updateFields = {};
    const allowedFields = [
      'priority', 'status', 'deadline', 'estimatedMinutes',
      'recurrence', 'title', 'description', 'subtasks', 'category',
    ];
    for (const [field, value] of Object.entries(suggestion.suggestedChange)) {
      if (allowedFields.includes(field)) {
        updateFields[field] = value;
      }
    }
    if (Object.keys(updateFields).length > 0) {
      updateFields['aiMeta.lastReasoning'] = `User approved agent suggestion: ${suggestion.reasoning}`;
      updateFields['aiMeta.lastEvaluatedAt'] = new Date();
      await Task.findByIdAndUpdate(suggestion.relatedTask._id, { $set: updateFields });
    }
  }

  suggestion.wasAccepted = true;
  suggestion.isPendingSuggestion = false;
  await suggestion.save();

  res.json({
    success: true,
    message: 'Suggestion approved and applied',
    suggestion,
  });
});

// ─── REJECT SUGGESTION ───────────────────────────────────────────────────────
/**
 * POST /api/agent/suggestions/:id/reject
 * User rejects the suggestion — no change applied, logged for learning.
 */
export const rejectSuggestion = asyncHandler(async (req, res) => {
  const suggestion = await AgentLog.findOne({
    _id: req.params.id,
    user: req.user._id,
    isPendingSuggestion: true,
    wasAccepted: null,
  });

  if (!suggestion) {
    res.status(404);
    throw new Error('Suggestion not found or already resolved');
  }

  suggestion.wasAccepted = false;
  suggestion.isPendingSuggestion = false;
  await suggestion.save();

  res.json({
    success: true,
    message: 'Suggestion rejected — no changes applied',
  });
});

// ─── AI TASK BREAKDOWN ───────────────────────────────────────────────────────
/**
 * POST /api/tasks/:id/ai-breakdown
 * Gemini proposes a subtask breakdown for tasks with no subtasks and
 * tight deadlines. User can accept all/some/none.
 *
 * Rate-limited to 20 calls/day per user (see routes).
 * Google Technology: Gemini API — task decomposition
 */
export const aiTaskBreakdown = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    owner: req.user._id,
    deletedAt: null,
  });

  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  // Only breakdown tasks that are still active
  if (task.status === 'done' || task.status === 'missed') {
    res.status(400);
    throw new Error('Cannot breakdown a completed or missed task');
  }

  // ── Call Gemini for breakdown ──────────────────────────────────────────────
  const breakdown = await breakdownTaskWithGemini(task);

  // Log the breakdown suggestion as a pending item (user must accept)
  const log = await AgentLog.create({
    user: req.user._id,
    relatedTask: task._id,
    actionType: 'ai_breakdown',
    reasoning: breakdown.overallReasoning,
    isPendingSuggestion: true,
    wasAccepted: null,
    suggestedChange: {
      subtasks: breakdown.subtasks.map((s) => ({ title: s.title, done: false })),
    },
    source: 'gemini',
    geminiTokensUsed: breakdown.estimatedTokens || 0,
    autoApplied: false,
  });

  res.json({
    success: true,
    breakdown: {
      subtasks: breakdown.subtasks,
      overallReasoning: breakdown.overallReasoning,
      logId: log._id, // Frontend uses this to call approve/reject
    },
  });
});

// ─── ACCEPT BREAKDOWN ───────────────────────────────────────────────────────
/**
 * POST /api/tasks/:id/ai-breakdown/accept
 * Body: { subtaskIndices: [0, 1, 2] } — accept specific subtasks or all
 */
export const acceptBreakdown = asyncHandler(async (req, res) => {
  const { logId, selectedSubtasks } = req.body;

  if (!logId) {
    res.status(400);
    throw new Error('logId is required');
  }

  const log = await AgentLog.findOne({
    _id: logId,
    user: req.user._id,
    actionType: 'ai_breakdown',
    wasAccepted: null,
  });

  if (!log) {
    res.status(404);
    throw new Error('Breakdown log not found or already resolved');
  }

  const task = await Task.findOne({
    _id: log.relatedTask,
    owner: req.user._id,
    deletedAt: null,
  });

  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  // Use selected subtasks or accept all
  const subtasksToAdd = selectedSubtasks || log.suggestedChange?.subtasks || [];

  // Append to existing subtasks (don't overwrite)
  task.subtasks.push(...subtasksToAdd.map((s) => ({
    title: typeof s === 'string' ? s : s.title,
    done: false,
  })));

  task.aiMeta.lastReasoning = `User accepted AI breakdown: ${log.reasoning}`;
  task.aiMeta.lastEvaluatedAt = new Date();
  await task.save();

  log.wasAccepted = true;
  log.isPendingSuggestion = false;
  await log.save();

  res.json({
    success: true,
    message: `${subtasksToAdd.length} subtask(s) added from AI breakdown`,
    task,
  });
});
