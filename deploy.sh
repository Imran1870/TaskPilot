#!/usr/bin/env bash
# ==============================================================================
# TaskPilot Manual Deployment Automation Script (Google Cloud Run)
# 
# WARNING: Run this only when you have tested your changes locally and are ready
# to update the LIVE demo. Git commits to GitHub and production updates are two
# entirely separate, deliberate actions. There is NO automated CI/CD pipeline.
# ==============================================================================

# Halt execution instantly on any non-zero exit code
set -e
set -o pipefail

echo "=================================================="
echo "🚢 TaskPilot Production Deployment Console"
echo "=================================================="

# ── Step 1: Pre-flight Validations ──────────────────────────────────────────

# Verify gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo "❌ Error: Google Cloud CLI (gcloud) is not installed."
  echo "Please install it from https://cloud.google.com/sdk/gcloud before proceeding."
  exit 1
fi

# Verify user is authenticated
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
if [ -z "$ACTIVE_ACCOUNT" ]; then
  echo "❌ Error: No active Google Cloud account detected."
  echo "Please run 'gcloud auth login' and try again."
  exit 1
fi

# Retrieve active project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "❌ Error: No active Google Cloud project is selected in your config."
  echo "Please run 'gcloud config set project YOUR_PROJECT_ID' and try again."
  exit 1
fi

REGION="us-central1"
AR_REPO="taskpilot-repo"

echo "👤 Deployed by: $ACTIVE_ACCOUNT"
echo "🎯 GCP Target Project: $PROJECT_ID"
echo "📍 Target Region: $REGION"
echo "--------------------------------------------------"

# ── Step 2: Upfront GCP API Enablement ──────────────────────────────────────

echo "⚡ Enabling required Google Cloud APIs..."
gcloud services enable \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com

# ── Step 3: Artifact Registry Repository Setup ─────────────────────────────

echo "📁 Ensuring Artifact Registry repository '$AR_REPO' exists..."
gcloud artifacts repositories describe $AR_REPO --location=$REGION >/dev/null 2>&1 || \
gcloud artifacts repositories create $AR_REPO \
  --repository-format=docker \
  --location=$REGION \
  --description="TaskPilot Production Docker Images Repository"

# Configure local Docker to authenticate with GCP Registry
echo "🔐 Authenticating Docker helper for Artifact Registry..."
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# ── Step 4: Containerize & Push Backend ──────────────────────────────────────

echo "📦 Building production server container image..."
SERVER_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$AR_REPO/server:latest"
docker build -t $SERVER_IMAGE -f server/Dockerfile .

echo "📤 Pushing server image to Artifact Registry..."
docker push $SERVER_IMAGE

# ── Step 5: Deploy Backend to Cloud Run ──────────────────────────────────────

echo "🚀 Deploying 'taskpilot-server' to Cloud Run..."
gcloud run deploy taskpilot-server \
  --image=$SERVER_IMAGE \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=3 \
  --set-secrets="MONGO_URI=MONGO_URI:latest,JWT_ACCESS_SECRET=JWT_ACCESS_SECRET:latest,JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,AGENT_TICK_SECRET=AGENT_TICK_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,GOOGLE_CALENDAR_REDIRECT_URI=GOOGLE_CALENDAR_REDIRECT_URI:latest,CALENDAR_TOKEN_ENCRYPTION_KEY=CALENDAR_TOKEN_ENCRYPTION_KEY:latest" \
  --port=8080

# Capture dynamically allocated backend live URL
BACKEND_URL=$(gcloud run services describe taskpilot-server --platform=managed --region=$REGION --format="value(status.url)")
echo "✅ Server successfully deployed at: $BACKEND_URL"

# ── Step 6: Containerize & Push Frontend ─────────────────────────────────────

echo "📦 Building production client container image..."
echo "🔗 Injecting backend compiler variable VITE_API_URL=$BACKEND_URL"
CLIENT_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$AR_REPO/client:latest"
docker build --build-arg VITE_API_URL=$BACKEND_URL -t $CLIENT_IMAGE -f client/Dockerfile .

echo "📤 Pushing client image to Artifact Registry..."
docker push $CLIENT_IMAGE

# ── Step 7: Deploy Frontend to Cloud Run ─────────────────────────────────────

echo "🚀 Deploying 'taskpilot-client' to Cloud Run..."
gcloud run deploy taskpilot-client \
  --image=$CLIENT_IMAGE \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=3

# Capture frontend live URL
CLIENT_URL=$(gcloud run services describe taskpilot-client --platform=managed --region=$REGION --format="value(status.url)")
echo "✅ Client successfully deployed at: $CLIENT_URL"

# ── Step 8: Complete Circular Integration (CORS Lock) ──────────────────────

echo "🔗 Updating backend environment with active client URL for CORS enforcement..."
gcloud run services update taskpilot-server \
  --region=$REGION \
  --platform=managed \
  --update-env-vars CLIENT_URL=$CLIENT_URL,NODE_ENV=production

echo "=================================================="
echo "🎉 DEPLOYMENT SUCCESSFUL!"
echo "=================================================="
echo "🌐 Live Production Link: $CLIENT_URL"
echo "🎛️ Live Backend Endpoint: $BACKEND_URL/health"
echo "=================================================="
