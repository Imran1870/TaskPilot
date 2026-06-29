# Google Technology Usage Log

This file tracks the usage of Google technologies in the "Last-Minute Life Saver" project, detailing where and why they are called.

| Service | Where Used | Why |
| --- | --- | --- |
| **Gemini API / AI Studio** | `server/src/services/geminiService.js` — `analyzeTasksWithGemini()`, `breakdownTaskWithGemini()`, `generateNudgeWithGemini()`, `generateRescuePlan()`, `generateCommunicationDraft()`, `parseVoiceTranscript()`, `generateHabitNudge()`, `analyzeTasksWithContext()` | Core intelligence: structured JSON output for task risk analysis, autonomous subtask decomposition, context-aware nudge generation, voice task extraction, crisis rescue planning, and automated professional messaging. Single call-site with retries + circuit breaker for resilience. All outputs validated with Zod before any DB write. |
| **Google Calendar API** | `server/src/services/calendarService.js`, `server/src/controllers/calendarController.js`, `server/src/routes/calendarRoutes.js` | Calendar synchronization: Exchanges OAuth 2.0 authorization codes for access/refresh tokens. AES-256-CBC encrypts credentials at rest. Fetches user's busy windows to feed into the Gemini agent tick loop, preventing scheduling suggestions that clash with real-world meetings or classes. |
| **Google Cloud Scheduler** | Triggers `POST /api/agent/tick` every 5 minutes via HTTP request with shared-secret header | Drives the autonomous OBSERVE→DECIDE→ACT loop without requiring user interaction. Setup commands in `server/docs/scheduler-setup.md`. |
| **Google Cloud Run** | *Pending Phase 5* | Production container deployment for both `server/` and `client/` — scales to zero when idle. |
| **Google Secret Manager** | *Pending Phase 5* | Production storage for `GEMINI_API_KEY`, `AGENT_TICK_SECRET`, `MONGO_URI`, and JWT secrets. Grants access to Cloud Run service account via IAM. |
| **Google SMTP (Gmail)** | `server/src/services/notificationService.js` | Direct email delivery for critical time-deficit alerts using Nodemailer with Gmail SMTP (App Passwords) to notify users of urgent risk scores. |
| **Web Push Protocol** | `client/public/sw.js`, `client/src/App.jsx` | Native browser push notifications dispatched during agent ticks for low-priority deadline warnings and critical time deficits. |


## Phase 3 AI Integration Details

### Gemini Call Points
1. **Agent Tick Analysis** — `analyzeTasksWithGemini(tasks, userContext)`: Called once per user per tick cycle. Sends batch of at-risk tasks; receives structured JSON of recommended actions (reprioritize, split, escalate, nudge, reschedule). Auto-applies low-risk actions; queues high-risk for user approval.

2. **AI Breakdown** — `breakdownTaskWithGemini(task)`: On-demand by user via `POST /api/tasks/:id/ai-breakdown`. Gemini proposes 3-7 time-estimated subtasks for complex tasks. Rate-limited to 20/day per user. User selects which subtasks to accept.

3. **Context-Aware Nudge** — `generateNudgeWithGemini(task, userContext)`: Creates specific, actionable nudge messages (not generic "task is due soon") referencing actual task title, time gap vs effort, and suggesting one concrete next step.

### Safety Architecture
- **Untrusted AI output**: All Gemini responses parsed through Zod schema validation before any database write
- **Circuit breaker**: Trips after 3 consecutive Gemini failures → falls back to deterministic urgency scoring from `shared/urgency.js`
- **Exponential backoff**: Up to 3 retry attempts with 1s/2s/4s delays for transient API errors
- **Cost guard**: `MAX_GEMINI_CALLS_PER_TICK = 20` prevents runaway spend in a single tick cycle
- **Human-in-the-loop**: High-impact suggestions (split tasks, reschedule, draft messages) require explicit user approval before execution

---

## Phase 4 AI & Google Integration Details

### Google Calendar Sync
- **Authentication**: Implemented standard Google OAuth 2.0 Authorization Code flow with consent prompt screen to secure refresh tokens.
- **Encryption at Rest**: Tokens are encrypted using AES-256-CBC with a SHA-256 derived key, ensuring client credentials are safe in the database.
- **Context Injection**: Fetched events are mapped to basic start/end times and passed as `CALENDAR CONFLICTS` to Gemini during agent tick runs and rescue plan computations.

### Gemini Advanced Call Points
1. **Rescue Plan Generation** — `generateRescuePlan(task, calendarEvents)`: Generated on-demand when a task is at critical risk. Returns a structured JSON containing a Minimum Viable Completion scope, focused 10-minute action steps, cut scope elements, and a motivational focus line.
2. **Communication Message Drafting** — `generateCommunicationDraft(task, messageContext)`: Creates context-aware, polite email/chat drafts requesting extensions, explaining delays, or requesting assistance, strictly respecting the product trust boundary (rendered only to screen, copy-pasted manually).
3. **Voice Capturing** — `parseVoiceTranscript(transcript)`: Extracts structured task parameters (title, description, category, priority, estimatedMinutes) from speech-to-text transcripts with confidence level and parsing notes.
4. **Habit Nudges** — `generateHabitNudge(habit, userContext)`: Custom personalized streak-risk warning (e.g., "Don't break your 12-day streak for Morning Meditate! Log it before midnight.") triggered inside the tick loop.
