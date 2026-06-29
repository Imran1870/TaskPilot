import { z } from 'zod';

// Registration schema
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  timezone: z.string().optional().default('UTC'),
  notificationPreferences: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
  }).optional().default({ email: true, push: true }),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// Task schema
export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters').trim(),
  description: z.string().optional().default(''),
  deadline: z.string().refine((val) => {
    const parsed = new Date(val);
    return !isNaN(parsed.getTime()) && parsed > new Date();
  }, {
    message: 'Deadline must be a valid future date',
  }),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['pending', 'in-progress', 'done', 'missed', 'snoozed']).default('pending'),
  estimatedMinutes: z.number().int().nonnegative().optional().default(0),
  actualMinutes: z.number().int().nonnegative().optional().default(0),
  tags: z.array(z.string()).optional().default([]),
  subtasks: z.array(z.object({
    title: z.string().min(1, 'Subtask title is required').trim(),
    done: z.boolean().default(false),
  })).optional().default([]),
  category: z.enum(['assignment', 'meeting', 'bill', 'interview', 'personal', 'other']).default('personal'),
  recurrence: z.enum(['none', 'daily', 'weekly', 'custom']).default('none'),
});
