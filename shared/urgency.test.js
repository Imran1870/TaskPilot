import { computeUrgencyScore } from './urgency.js';

const runTests = () => {
  const now = new Date('2026-06-28T12:00:00Z');
  let passed = 0;
  let failed = 0;

  const assert = (name, condition, details) => {
    if (condition) {
      console.log(`✅ TEST PASSED: ${name}`);
      passed++;
    } else {
      console.error(`❌ TEST FAILED: ${name}. Details: ${details}`);
      failed++;
    }
  };

  // Case 1: Overdue task (deadline in past)
  try {
    const task = {
      deadline: new Date('2026-06-28T11:00:00Z').toISOString(),
      priority: 'medium',
      category: 'personal',
      estimatedMinutes: 30,
      subtasks: []
    };
    const score = computeUrgencyScore(task, now);
    assert('1. Overdue task returns 100', score === 100, `Expected 100, got ${score}`);
  } catch (err) {
    assert('1. Overdue task returns 100', false, err.message);
  }

  // Case 2: Due in 5 min, estimated 30 min (exceeds remaining time)
  try {
    const task = {
      deadline: new Date('2026-06-28T12:05:00Z').toISOString(),
      priority: 'high',
      category: 'assignment',
      estimatedMinutes: 30,
      subtasks: []
    };
    const score = computeUrgencyScore(task, now);
    // Since estimatedMinutes (30) > timeRemaining (5), base score is 70 + priority high (15) + category assignment (4) = 89
    assert('2. Due-in-5-min (with estimated minutes > remaining) has high score', score === 89, `Expected 89, got ${score}`);
  } catch (err) {
    assert('2. Due-in-5-min has high score', false, err.message);
  }

  // Case 3: Due in 30 days
  try {
    const task = {
      deadline: new Date('2026-07-28T12:00:00Z').toISOString(), // 30 days
      priority: 'low',
      category: 'personal',
      estimatedMinutes: 10,
      subtasks: []
    };
    const score = computeUrgencyScore(task, now);
    // timeRemainingMin is 43200. Proximity gives +5. priority low is +0, category personal is +2. score = 7
    assert('3. Due in 30 days has low score', score === 7, `Expected 7, got ${score}`);
  } catch (err) {
    assert('3. Due in 30 days has low score', false, err.message);
  }

  // Case 4: No estimate provided (estimatedMinutes = 0)
  try {
    const task = {
      deadline: new Date('2026-06-28T14:00:00Z').toISOString(), // 2 hours
      priority: 'medium',
      category: 'personal',
      estimatedMinutes: 0,
      subtasks: []
    };
    const score = computeUrgencyScore(task, now);
    // timeRemainingMin = 120 (under 3h, so +40). priority medium (+10), category personal (+2). Total = 52.
    assert('4. No estimate provided handles correctly', score === 52, `Expected 52, got ${score}`);
  } catch (err) {
    assert('4. No estimate provided handles correctly', false, err.message);
  }

  // Case 5: Critical priority near deadline
  try {
    const task = {
      deadline: new Date('2026-06-28T12:45:00Z').toISOString(), // 45 min (under 1 hr)
      priority: 'critical',
      category: 'interview',
      estimatedMinutes: 20,
      subtasks: [
        { title: 'Subtask 1', done: false },
        { title: 'Subtask 2', done: false }
      ]
    };
    const score = computeUrgencyScore(task, now);
    // timeRemainingMin = 45 (under 1h, so +55). priority critical (+20). category interview (+10). incomplete subtasks ratio 2/2 (+5). Total = 90.
    assert('5. Critical priority near deadline has extremely high score', score === 90, `Expected 90, got ${score}`);
  } catch (err) {
    assert('5. Critical priority near deadline has extremely high score', false, err.message);
  }

  console.log(`\n📊 TEST SUMMARY: ${passed} passed, ${failed} failed.\n`);
  process.exit(failed > 0 ? 1 : 0);
};

runTests();
