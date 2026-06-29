/**
 * voiceController.js — Voice-Enabled Task Capture
 *
 * Feature 5: VOICE CAPTURE
 * Receives a voice transcript from the client (Web Speech API),
 * sends it to Gemini for structured task extraction,
 * returns a pre-filled task form for user confirmation.
 *
 * Security:
 *  - Input capped at 500 characters (prevents prompt stuffing)
 *  - Input sanitized (strip control characters)
 *  - Gemini system prompt instructs it to treat input as data only
 *    and ignore any embedded override instructions (prompt injection mitigation)
 *  - Task is NEVER auto-created — user must confirm the pre-filled form
 *
 * Google Technology: Gemini API — natural language → structured task extraction
 */

import { asyncHandler } from '../middleware/errorMiddleware.js';
import { parseVoiceTranscript } from '../services/geminiService.js';
import { z } from 'zod';

// ─── Input validation schema ──────────────────────────────────────────────────
const voiceInputSchema = z.object({
  transcript: z
    .string()
    .min(3, 'Transcript too short')
    .max(500, 'Transcript too long — voice input is capped at 500 characters')
    .transform((s) => {
      // Strip control characters and null bytes (prompt injection vector)
      // eslint-disable-next-line no-control-regex
      return s.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
    }),
});

// ─── PARSE VOICE TRANSCRIPT ──────────────────────────────────────────────────
/**
 * POST /api/tasks/parse-voice
 * Rate limited: 30/day per user (see taskRoutes.js)
 *
 * Returns a pre-filled task object. Client shows confirmation form.
 * Task MUST be separately POSTed to /api/tasks to be saved.
 */
export const parseVoiceInput = asyncHandler(async (req, res) => {
  // Validate & sanitize input
  const parsed = voiceInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400);
    throw new Error(parsed.error.errors[0]?.message || 'Invalid voice input');
  }

  const { transcript } = parsed.data;

  console.log(`[Voice] Parsing transcript (${transcript.length} chars) for user ${req.user._id}`);

  const extracted = await parseVoiceTranscript(transcript);

  // Parse the deadline if it's a valid ISO string
  let deadlineDate = null;
  if (extracted.deadline) {
    const d = new Date(extracted.deadline);
    if (!isNaN(d.getTime()) && d > new Date()) {
      deadlineDate = d.toISOString();
    }
  }

  res.json({
    success: true,
    trustNote: 'Task not saved yet. Review and confirm the form below before saving.',
    original: {
      transcript,
      characterCount: transcript.length,
    },
    extracted: {
      title: extracted.title,
      description: extracted.description || '',
      deadline: deadlineDate,
      category: extracted.category,
      priority: extracted.priority,
      estimatedMinutes: extracted.estimatedMinutes,
      confidence: extracted.confidence,
      extractionNotes: extracted.extractionNotes,
    },
  });
});
