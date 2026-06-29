import { Task } from '../models/Task.js';
import { computeUrgencyScore } from '../../../shared/urgency.js';
import { generateNextOccurrence } from '../services/recurrenceService.js';
import { asyncHandler } from '../middleware/errorMiddleware.js';

// @desc    Get user tasks with filters, sorting, and pagination
// @route   GET /api/tasks
// @access  Private
export const getTasks = asyncHandler(async (req, res) => {
  const { 
    status, 
    category, 
    startDate, 
    endDate, 
    sortBy = 'deadline:asc',
    page = 1,
    limit = 10 
  } = req.query;

  // Auto-transition overdue tasks to missed status
  try {
    const overdueTasks = await Task.find({
      owner: req.user._id,
      status: { $in: ['pending', 'in-progress'] },
      deadline: { $lte: new Date() },
      deletedAt: null
    });
    if (overdueTasks.length > 0) {
      for (const t of overdueTasks) {
        t.status = 'missed';
        await t.save();
        console.log(`[Overdue Check] Task "${t.title}" auto-marked as missed.`);
      }
    }
  } catch (err) {
    console.error('[Overdue Check] Error updating tasks:', err.message);
  }

  // Build query: only owned and non-soft-deleted tasks
  const query = { 
    owner: req.user._id,
    deletedAt: null 
  };

  // Filters
  if (status) {
    query.status = status;
  }
  if (category) {
    query.category = category;
  }
  if (startDate || endDate) {
    query.deadline = {};
    if (startDate) {
      query.deadline.$gte = new Date(startDate);
    }
    if (endDate) {
      query.deadline.$lte = new Date(endDate);
    }
  }

  // Sorting
  let sort = {};
  const [field, order] = sortBy.split(':');
  sort[field] = order === 'desc' ? -1 : 1;

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const total = await Task.countDocuments(query);
  const tasks = await Task.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  res.json({
    success: true,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    hasMore: skip + tasks.length < total,
    tasks,
  });
});

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
export const createTask = asyncHandler(async (req, res) => {
  const { deadline } = req.body;

  // Specific user-friendly validation for past deadlines
  if (new Date(deadline) <= new Date()) {
    res.status(400);
    const err = new Error('Task deadline must be a future date on creation');
    err.code = 'DEADLINE_IN_PAST';
    throw err;
  }

  // Pre-calculate risk score
  const riskScore = computeUrgencyScore(req.body, new Date());

  const taskData = {
    ...req.body,
    owner: req.user._id,
    aiMeta: {
      lastReasoning: 'Initial deterministic risk score calculation.',
      riskScore,
      lastEvaluatedAt: new Date(),
    }
  };

  const task = await Task.create(taskData);

  res.status(201).json({
    success: true,
    task,
  });
});

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ 
    _id: req.params.id, 
    owner: req.user._id,
    deletedAt: null 
  });

  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  res.json({
    success: true,
    task,
  });
});

// @desc    Update task (partial PATCH or full PUT)
// @route   PATCH /api/tasks/:id
// @access  Private
export const updateTask = asyncHandler(async (req, res) => {
  let task = await Task.findOne({ 
    _id: req.params.id, 
    owner: req.user._id,
    deletedAt: null 
  });

  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const prevStatus = task.status;

  // Fields to update
  const fields = [
    'title', 'description', 'deadline', 'priority', 
    'status', 'estimatedMinutes', 'actualMinutes', 
    'tags', 'subtasks', 'category', 'recurrence'
  ];

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field];
    }
  });

  // Re-calculate risk score on update
  task.aiMeta.riskScore = computeUrgencyScore(task, new Date());
  task.aiMeta.lastEvaluatedAt = new Date();
  task.aiMeta.lastReasoning = 'Risk score recalculated on update.';

  const updatedTask = await task.save();

  // If status transitioned to 'done', trigger recurrence generation
  if (prevStatus !== 'done' && updatedTask.status === 'done') {
    await generateNextOccurrence(updatedTask);
  }

  res.json({
    success: true,
    task: updatedTask,
  });
});

// @desc    Permanently delete task and related logs
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  // Hard delete
  await Task.deleteOne({ _id: req.params.id });

  // Clean up related AgentLog entries referencing this task
  try {
    const { AgentLog } = await import('../models/AgentLog.js');
    await AgentLog.deleteMany({ relatedTask: req.params.id });
  } catch (err) {
    console.error(`[Delete Cleanup] Error clearing logs for task ${req.params.id}:`, err.message);
  }

  res.json({
    success: true,
    message: 'Task and related logs permanently deleted successfully',
  });
});

// @desc    Get calendar view tasks for a month
// @route   GET /api/tasks/calendar
// @access  Private
export const getCalendarTasks = asyncHandler(async (req, res) => {
  const { month } = req.query; // YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400);
    throw new Error('Invalid month format. Please use YYYY-MM');
  }

  const [year, monthVal] = month.split('-');
  const startDate = new Date(Date.UTC(parseInt(year, 10), parseInt(monthVal, 10) - 1, 1));
  const endDate = new Date(Date.UTC(parseInt(year, 10), parseInt(monthVal, 10), 1));

  // Find all active tasks in this date range
  // Optimized payload: project only fields needed for calendar cards
  const tasks = await Task.find({
    owner: req.user._id,
    deletedAt: null,
    deadline: { $gte: startDate, $lt: endDate }
  }).select('title deadline status priority category aiMeta.riskScore');

  res.json({
    success: true,
    tasks
  });
});

// @desc    Add a subtask or toggle subtask status
// @route   POST /api/tasks/:id/subtasks
// @access  Private
export const addOrToggleSubtask = asyncHandler(async (req, res) => {
  const { title, done, subtaskId } = req.body;

  let task = await Task.findOne({
    _id: req.params.id,
    owner: req.user._id,
    deletedAt: null
  });

  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  if (subtaskId) {
    // Toggle subtask status
    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      res.status(404);
      throw new Error('Subtask not found');
    }
    if (done !== undefined) {
      subtask.done = done;
    }
  } else {
    // Add subtask
    if (!title) {
      res.status(400);
      throw new Error('Subtask title is required');
    }
    task.subtasks.push({ title, done: false });
  }

  // Re-calculate risk score due to subtask changes
  task.aiMeta.riskScore = computeUrgencyScore(task, new Date());
  await task.save();

  res.json({
    success: true,
    task
  });
});
