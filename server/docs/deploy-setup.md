# Google Cloud Run Deployment Setup Guide (Manual)

This document provides step-by-step instructions to configure your Google Cloud Platform (GCP) project manually, create production secrets, set up IAM permission bindings, run the manual deployment script, and establish the Cloud Scheduler cron job.

---

## Step 1: GCP Account and CLI Initialization

1. Download and install the [Google Cloud SDK (CLI)](https://cloud.google.com/sdk/docs/install).
2. Authenticate with your Google account:
   ```bash
   gcloud auth login
   ```
3. Create a GCP Project (or select an existing one):
   ```bash
   gcloud projects create YOUR_PROJECT_ID
   ```
4. Set the active project in your local CLI configuration:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```
5. Ensure billing is enabled for your project (required for Cloud Run dynamic scaling and Secret Manager).

---

## Step 2: Enable Required APIs

Run the following command to enable the necessary APIs for deployment, storage, and cron scheduling:
```bash
gcloud services enable \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com
```

---

## Step 3: Configure Secret Manager

We store all production environment variables securely in Google Secret Manager. Run these commands to register each secret.

### 1. Register Secret Names in Secret Manager
```bash
gcloud secrets create MONGO_URI --replication-policy="automatic"
gcloud secrets create JWT_ACCESS_SECRET --replication-policy="automatic"
gcloud secrets create JWT_REFRESH_SECRET --replication-policy="automatic"
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
gcloud secrets create AGENT_TICK_SECRET --replication-policy="automatic"
gcloud secrets create GOOGLE_CLIENT_ID --replication-policy="automatic"
gcloud secrets create GOOGLE_CLIENT_SECRET --replication-policy="automatic"
gcloud secrets create GOOGLE_CALENDAR_REDIRECT_URI --replication-policy="automatic"
gcloud secrets create CALENDAR_TOKEN_ENCRYPTION_KEY --replication-policy="automatic"
```

### 2. Add Values/Versions to Secrets
Fill in your actual production values by adding versions:
```bash
echo -n "mongodb+srv://..." | gcloud secrets versions add MONGO_URI --data-file=-
echo -n "your_jwt_access_secret_key" | gcloud secrets versions add JWT_ACCESS_SECRET --data-file=-
echo -n "your_jwt_refresh_secret_key" | gcloud secrets versions add JWT_REFRESH_SECRET --data-file=-
echo -n "AIzaSy..." | gcloud secrets versions add GEMINI_API_KEY --data-file=-
echo -n "your_shared_tick_secret" | gcloud secrets versions add AGENT_TICK_SECRET --data-file=-
echo -n "client_id_from_google" | gcloud secrets versions add GOOGLE_CLIENT_ID --data-file=-
echo -n "client_secret_from_google" | gcloud secrets versions add GOOGLE_CLIENT_SECRET --data-file=-
echo -n "https://taskpilot-server-xyz.a.run.app/api/calendar/callback" | gcloud secrets versions add GOOGLE_CALENDAR_REDIRECT_URI --data-file=-
echo -n "32_character_token_encryption_key" | gcloud secrets versions add CALENDAR_TOKEN_ENCRYPTION_KEY --data-file=-
```

### 3. Grant Secret Manager Access to Cloud Run
By default, Cloud Run instances execute using the **Compute Engine default service account**. To allow Cloud Run to access the secrets at runtime, grant it the Secret Accessor role:

```bash
# Retrieve project number dynamically
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# Grant secretAccessor role
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Step 4: MongoDB Atlas Network Ingress Setup

Because Google Cloud Run uses dynamic egress IP ranges, your server's outgoing IP address will change. To ensure the database connection succeeds:
1. Open the **MongoDB Atlas Console**.
2. Navigate to **Security** → **Network Access**.
3. Add a whitelist entry for `0.0.0.0/0` (allows incoming requests from all IP addresses, secured by your database username/password credentials).
*(For advanced setups, configure a Serverless VPC Access connector mapped to a Cloud NAT gateway with static IP allocation).*

---

## Step 5: Execute Manual Deployment Script

Run the automated deploy script from the project root. The script compiles containers locally, pushes them to Artifact Registry, deploys them to Cloud Run, captures the backend URL, embeds it into the client at build time, and updates backend CORS limits.

```bash
# Set script permissions (on Unix/bash shells)
chmod +x deploy.sh

# Run manual deploy
./deploy.sh
```

---

## Step 6: Configure Cloud Scheduler (Agent Tick Trigger)

The TaskPilot autonomous agent requires a periodic trigger to process ticks, evaluate task urgency, and issue nudges. Create a Google Cloud Scheduler HTTP job pointing to your deployed backend:

```bash
# Change live-backend-url and shared-tick-secret to match your deployment
gcloud scheduler jobs create http taskpilot-agent-tick \
  --schedule="*/5 * * * *" \
  --uri="YOUR_LIVE_BACKEND_URL/api/agent/tick" \
  --http-method="POST" \
  --headers="x-agent-secret=YOUR_SHARED_AGENT_TICK_SECRET,Content-Type=application/json" \
  --message-body="{}" \
  --time-zone="UTC" \
  --location="us-central1"
```

---

## Recovering From Failures

1. **API Enablement or Billing Errors:** If the script exits saying billing or APIs aren't ready, verify billing setup, and simply run `./deploy.sh` again once resolved.
2. **Docker Authentication Timeout:** If local Docker fails to push, verify `gcloud auth configure-docker us-central1-docker.pkg.dev` completed successfully, and run `./deploy.sh` again.
3. **Circular URL Mismatch:** The script automatically runs `gcloud run services update` at the very end to link the newly deployed client URL with the backend CORS rules. Re-running the script at any time updates this cleanly without creating duplicate services.
