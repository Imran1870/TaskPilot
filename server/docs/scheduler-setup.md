# Google Cloud Scheduler Setup — Agent Tick

## Overview

The autonomous agent tick (`POST /api/agent/tick`) is designed to be called
periodically by **Google Cloud Scheduler**, not a human browser. This document
provides the exact commands to configure this in production on Google Cloud.

---

## Prerequisites

```bash
# Install Google Cloud CLI if not already installed
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID
```

---

## Step 1: Enable Required APIs

```bash
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable run.googleapis.com
```

---

## Step 2: Create the Scheduler Job

Replace the placeholders with your real values:

```bash
gcloud scheduler jobs create http last-minute-agent-tick \
  --location=us-central1 \
  --schedule="*/5 * * * *" \
  --uri="https://YOUR_CLOUD_RUN_SERVICE_URL/api/agent/tick" \
  --http-method=POST \
  --headers="Content-Type=application/json,x-agent-secret=YOUR_AGENT_TICK_SECRET" \
  --message-body='{"lookAheadHours": 24}' \
  --time-zone="UTC" \
  --description="Autonomous agent tick: OBSERVE→DECIDE→ACT loop for Last-Minute Life Saver"
```

### Parameters:
| Parameter | Value | Notes |
|---|---|---|
| `--schedule` | `*/5 * * * *` | Every 5 minutes — adjust based on cost/urgency |
| `--uri` | Your Cloud Run URL + `/api/agent/tick` | Update after deployment |
| `x-agent-secret` | From `AGENT_TICK_SECRET` env var | Store in Google Secret Manager |
| `lookAheadHours` | `24` | How far ahead to scan for at-risk tasks |

---

## Step 3: Store Secrets in Google Secret Manager

```bash
# Store the agent tick secret securely
echo -n "YOUR_AGENT_TICK_SECRET" | \
  gcloud secrets create agent-tick-secret --data-file=-

# Store Gemini API key
echo -n "YOUR_GEMINI_API_KEY" | \
  gcloud secrets create gemini-api-key --data-file=-

# Grant Cloud Run service account access to secrets
gcloud secrets add-iam-policy-binding agent-tick-secret \
  --role="roles/secretmanager.secretAccessor" \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com"
```

---

## Step 4: Verify the Job

```bash
# List jobs
gcloud scheduler jobs list --location=us-central1

# Manually trigger a tick (for testing)
gcloud scheduler jobs run last-minute-agent-tick --location=us-central1

# View execution logs
gcloud logging read "resource.type=cloud_scheduler_job" --limit=20
```

---

## Step 5: View Agent Activity

After the scheduler triggers the tick, agent decisions will be visible in:
1. **Application dashboard** → "Your AI Assistant" panel shows every logged decision
2. **AgentLog MongoDB collection** — every action + reasoning is stored
3. **Cloud Run logs**: `gcloud logging read "resource.type=cloud_run_revision" --limit=50`

---

## Security Notes

- The `x-agent-secret` header authenticates Cloud Scheduler to the backend
- This secret is **not** a user JWT — it's a server-to-server shared secret
- The backend validates this header strictly and logs any unauthorized attempts
- In production, rotate this secret via Google Secret Manager (no code deploy needed)
- The Gemini API key is **never** sent to the client — only read server-side from env

---

## Cost Management

- Each agent tick makes **at most** `MAX_GEMINI_CALLS_PER_TICK` (currently 20) Gemini calls
- A circuit breaker trips after 3 consecutive Gemini failures, falling back to deterministic scoring (no API cost)
- Token usage is estimated and logged per AgentLog entry for cost auditing
- At 5-minute intervals with 20 users: ~288 ticks/day × avg 3 Gemini calls = ~864 calls/day
