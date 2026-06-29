/**
 * Pure function to compute the urgency/risk score of a task (0 to 100).
 * Factoring: time remaining vs estimatedMinutes, priority, category, and subtask completion.
 *
 * @param {Object} task - The task object containing deadline, priority, category, estimatedMinutes, subtasks.
 * @param {Date|String|Number} [nowInput] - The reference "now" time.
 * @returns {Number} Urgency score from 0 to 100.
 */
export function computeUrgencyScore(task, nowInput) {
  const now = nowInput ? new Date(nowInput) : new Date();
  const deadline = new Date(task.deadline);
  
  if (isNaN(deadline.getTime())) {
    return 0;
  }

  const timeRemainingMs = deadline.getTime() - now.getTime();
  const timeRemainingMin = timeRemainingMs / (1000 * 60);

  // 1. Overdue tasks are automatic 100 (highest risk)
  if (timeRemainingMin <= 0) {
    return 100;
  }

  let score = 0;

  // 2. Time proximity scoring — generous tiers to allow reaching 80+
  const estimated = task.estimatedMinutes || 30; // default 30min estimate
  
  if (timeRemainingMin <= estimated) {
    // Less time remaining than needed to complete = CRITICAL
    score += 75;
  } else if (timeRemainingMin <= 60) {
    // Under 1 hour
    score += 65;
  } else if (timeRemainingMin <= 120) {
    // Under 2 hours
    score += 55;
  } else if (timeRemainingMin <= 480) {
    // Under 8 hours (same day / shift)
    score += 40;
  } else if (timeRemainingMin <= 1440) {
    // Under 24 hours
    score += 28;
  } else if (timeRemainingMin <= 4320) {
    // Under 3 days
    score += 18;
  } else if (timeRemainingMin <= 10080) {
    // Under 1 week
    score += 10;
  } else if (timeRemainingMin <= 43200) {
    // Under 30 days
    score += 3;
  }

  // 3. Priority weight
  const priorityWeights = {
    critical: 20,
    high: 15,
    medium: 8,
    low: 0
  };
  score += priorityWeights[task.priority] || 0;

  // 4. Category weight (e.g. interview > bill > personal by default)
  const categoryWeights = {
    interview: 8,
    bill: 6,
    meeting: 5,
    assignment: 4,
    personal: 2,
    other: 0
  };
  score += categoryWeights[task.category] || 0;

  // 5. Incomplete subtasks weight (factors complexity of remaining items)
  if (task.subtasks && task.subtasks.length > 0) {
    const total = task.subtasks.length;
    const incomplete = task.subtasks.filter(s => !s.done).length;
    if (incomplete > 0) {
      // Scale from 1 to 5 points based on ratio of incomplete subtasks
      score += Math.round((incomplete / total) * 5);
    }
  }

  // Clamp final score between 0 and 100
  return Math.min(Math.max(score, 0), 100);
}

