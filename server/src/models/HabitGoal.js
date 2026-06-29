import mongoose from 'mongoose';

const habitGoalSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Habit title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },
  // Phase 4: Category for grouping and agent context
  category: {
    type: String,
    enum: ['fitness', 'learning', 'mindfulness', 'productivity', 'health', 'social', 'other'],
    default: 'other',
  },
  targetFrequency: {
    type: String,
    enum: ['daily', '3x_week', '5x_week', 'weekdays', 'weekends', 'custom'],
    required: [true, 'Target frequency is required'],
  },
  // Phase 4: Which days of the week (for custom frequency)
  targetDays: {
    type: [String],
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    default: [],
  },
  // Phase 4: Optional daily reminder time (HH:MM format)
  reminderTime: {
    type: String,
    match: [/^\d{2}:\d{2}$/, 'Reminder time must be in HH:MM format'],
    default: null,
  },
  streakCount: {
    type: Number,
    min: 0,
    default: 0,
  },
  longestStreak: {
    type: Number,
    min: 0,
    default: 0,
  },
  lastCompletedAt: {
    type: Date,
    default: null,
  },
  // Phase 4: Full history of completion dates for analytics
  completionLog: {
    type: [Date],
    default: [],
  },
  // Phase 4: Whether the agent should send nudges for this habit
  agentNudgeEnabled: {
    type: Boolean,
    default: true,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for agent tick habit queries
habitGoalSchema.index({ owner: 1, streakCount: -1 });
habitGoalSchema.index({ owner: 1, agentNudgeEnabled: 1 });

export const HabitGoal = mongoose.model('HabitGoal', habitGoalSchema);
