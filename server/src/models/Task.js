import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    default: '',
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required'],
    validate: {
      validator: function(value) {
        // Enforce future date only on creation of new tasks
        if (this.isNew) {
          return value > new Date();
        }
        return true;
      },
      message: 'Deadline must be a future date on creation',
    },
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: '{VALUE} is not a valid priority',
    },
    default: 'medium',
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'in-progress', 'done', 'missed', 'snoozed'],
      message: '{VALUE} is not a valid status',
    },
    default: 'pending',
  },
  estimatedMinutes: {
    type: Number,
    min: [0, 'Estimated minutes cannot be negative'],
    default: 0,
  },
  actualMinutes: {
    type: Number,
    min: [0, 'Actual minutes cannot be negative'],
    default: 0,
  },
  tags: {
    type: [String],
    default: [],
  },
  subtasks: [{
    title: {
      type: String,
      required: [true, 'Subtask title is required'],
      trim: true,
    },
    done: {
      type: Boolean,
      default: false,
    },
  }],
  category: {
    type: String,
    enum: {
      values: ['assignment', 'meeting', 'bill', 'interview', 'personal', 'other'],
      message: '{VALUE} is not a valid category',
    },
    default: 'personal',
  },
  recurrence: {
    type: String,
    enum: {
      values: ['none', 'daily', 'weekly', 'custom'],
      message: '{VALUE} is not a valid recurrence pattern',
    },
    default: 'none',
  },
  aiMeta: {
    lastReasoning: {
      type: String,
      default: '',
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    lastEvaluatedAt: {
      type: Date,
      default: null,
    },
    notificationSent: {
      type: String,
      enum: ['none', 'push_only', 'email_and_push'],
      default: 'none',
    },
    contentHash: {
      type: String,
      default: '',
    },
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

export const Task = mongoose.model('Task', taskSchema);
