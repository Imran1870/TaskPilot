import { Task } from '../models/Task.js';
import { computeUrgencyScore } from '../../../shared/urgency.js';

/**
 * Automatically creates the next instance of a task if it is recurring.
 * 
 * @param {Object} task - The Mongoose task document that was just completed.
 * @returns {Promise<Object|null>} The newly created task document, or null if not recurring.
 */
export const generateNextOccurrence = async (task) => {
  if (!task.recurrence || task.recurrence === 'none') {
    return null;
  }

  const currentDeadline = new Date(task.deadline);
  const nextDeadline = new Date(currentDeadline);

  if (task.recurrence === 'daily') {
    nextDeadline.setDate(nextDeadline.getDate() + 1);
  } else if (task.recurrence === 'weekly') {
    nextDeadline.setDate(nextDeadline.getDate() + 7);
  } else if (task.recurrence === 'custom') {
    // Custom defaults to +3 days in the future
    nextDeadline.setDate(nextDeadline.getDate() + 3);
  }

  // Create a template for the new task
  const nextTaskData = {
    owner: task.owner,
    title: task.title,
    description: task.description,
    deadline: nextDeadline,
    priority: task.priority,
    status: 'pending',
    estimatedMinutes: task.estimatedMinutes,
    actualMinutes: 0,
    tags: task.tags,
    // Duplicate subtasks list but reset the done status
    subtasks: task.subtasks.map((s) => ({ title: s.title, done: false })),
    category: task.category,
    recurrence: task.recurrence,
    aiMeta: {
      lastReasoning: `Deterministic recurrence triggered from task ${task._id}`,
      riskScore: 0, // Computed below
      lastEvaluatedAt: new Date(),
    },
  };

  // Compute the initial risk score for the next task
  nextTaskData.aiMeta.riskScore = computeUrgencyScore(nextTaskData, new Date());

  // Save to database
  const nextTask = new Task(nextTaskData);
  await nextTask.save();

  return nextTask;
};
