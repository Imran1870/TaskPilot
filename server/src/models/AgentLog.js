import mongoose from 'mongoose';

const agentLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  actionType: {
    type: String,
    enum: {
      values: [
        'reprioritized',
        'suggested_split',
        'drafted_message',
        'escalated',
        'rescheduled',
        'nudge_sent',
        'ai_breakdown',
        'risk_updated',
        'suggestion_pending',
      ],
      message: '{VALUE} is not a valid action type',
    },
    required: true,
  },
  reasoning: {
    type: String,
    required: [true, 'Reasoning is required for transparency'],
  },
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null,
  },
  wasAccepted: {
    type: Boolean,
    default: null, // null = pending, true = accepted, false = rejected
  },
  // LOW-RISK: auto-applied immediately without user confirmation
  autoApplied: {
    type: Boolean,
    default: false,
  },
  // HIGH-IMPACT: pending user approval before execution
  isPendingSuggestion: {
    type: Boolean,
    default: false,
  },
  // The actual change payload the agent wants to apply (for pending suggestions)
  suggestedChange: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  // Gemini-generated nudge message shown to user (context-aware, not generic)
  nudgeMessage: {
    type: String,
    default: null,
  },
  // Track which source produced this log entry
  source: {
    type: String,
    enum: ['gemini', 'deterministic_fallback', 'user'],
    default: 'gemini',
  },
  // Token usage for cost tracking
  geminiTokensUsed: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for fast per-user queries and pending suggestion lookups
agentLogSchema.index({ user: 1, timestamp: -1 });
agentLogSchema.index({ user: 1, isPendingSuggestion: 1, wasAccepted: 1 });

export const AgentLog = mongoose.model('AgentLog', agentLogSchema);
