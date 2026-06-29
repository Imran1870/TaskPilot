# TaskPilot — Autonomous AI Co-Pilot Command Center

TaskPilot is an agentic, proactive productivity console designed to break the loop of student procrastination, priority misalignment, and cognitive overload. Rather than acting as a passive dashboard, TaskPilot operates like a calm, competent co-pilot under pressure: scanning deadlines, evaluating schedule risks, integrating Google Calendar availability, and autonomously taking steps to prevent deadlines from slipping.

---

## 🎨 Visual Identity & Theme
TaskPilot is built with a **Void Midnight Command Cockpit** theme with high-density visual telemetry:
* **Midnight Gradient Canvas:** A deep violet-indigo radial background glow (`#171638` fading to `#090e1a`) to soothe screen fatigue.
* **Proactive Status HUD:** An interactive, spinning SVG radar HUD indicator reflecting the agent's scan activities.
* **Temperature-Scale Risk Mapping:** Visualizes task priority and deadline urgency using color-blind accessible risk badges:
  * `❄️ Safe (0-39% risk score)`
  * `🌹 Alert (40-79% risk score)`
  * `🔥 Danger (80-100% risk score)`
* **Dual Theme Toggle:** Instantly switches between Void Midnight and clean Light Mist themes with unified element color overrides.

---

## 🚀 Key Features

### 1. Observe-Decide-Act Telemetry Loop
Runs a background check loop every 30 minutes to dynamically evaluate task schedules, priority weights, and time deficits. The agent's logs are streamed directly to a monospaced **Telemetry Syslog** console.

### 2. Anxiety-Safe Rescue Mode
Triggered when remaining work duration exceeds free calendar hours. Opens a dedicated focus dashboard containing:
* A digital focus pomodoro timer.
* Immediate deferral suggestion logs.
* **AI Message Drafter:** Calls Google Gemini to compile professional extension requests or notification emails for stakeholders.

### 3. Voice-Activated Task Capture
Dictate tasks directly to the console (e.g. *"add assignment study guide due tomorrow at 5pm estimated 90 minutes"*). TaskPilot uses the Web Speech API and Gemini structured schemas to parse details, categories, and estimates into the database automatically.

### 4. Connected Google Calendar Integration
Syncs calendar availability periods over Google OAuth 2.0. Busy blocks are integrated into the scheduling deficit check to maintain realistic daily workloads.

### 5. Habit Streak Engine
Monitors daily habits and triggers personalized, encouraging Gemini-generated notifications to motivate users before a streak breaks.

### 6. Proactive Antispam Notifications
Combines browser-based Service Worker **Web Push Notifications** and HTML-formatted **Email Alerts** (relayed via Gmail SMTP) to alert users to high-risk states without causing fatigue.

---

## 💻 Tech Stack

### Client (Frontend)
* **React 18 & Vite:** Fast build speeds, component layout structure, and route-based code-splitting (`React.lazy`).
* **Tailwind CSS & Vanilla CSS Variables:** Premium glassmorphic card widgets, radial gradient backdrops, custom animations, and `prefers-reduced-motion` fallbacks.
* **Zustand:** Lightweight state management stores for persistent authentication and theme preferences.
* **Lucide React:** Icon sets for consistent cockpit console symbols.

### Server (Backend)
* **Express & Node.js:** Scalable REST APIs handling route requests, authentication, and sanitization.
* **Mongoose & MongoDB Atlas:** Schema validators, soft-delete indexes, and user configuration records.
* **Nodemailer:** Automated email delivery mapping HTML tables.
* **Web-Push (npm):** Payload signing and transmission for web notifications.

---

## 🧠 Google Technologies Utilized

For an in-depth breakdown of Google services used within TaskPilot, see the [Google Tech Usage Document](file:///d:/New%20folder/GOOGLE_TECH_USAGE.md).

* **Google Gemini API (via Google AI Studio):** Powers voice command schema extraction, subtask decomposition, habit nudges, and Rescue Mode message templates.
* **Google Calendar API:** Syncs calendar busy blocks using dynamic OAuth 2.0 calendars.
* **Google OAuth 2.0:** Handles secure authentication scopes with encrypted tokens stored in MongoDB.
* **Gmail SMTP:** Relays automated email warnings and task load tables.

---

## 🛠️ Getting Started

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **MongoDB** instance running locally or via MongoDB Atlas

### 1. Configure Environment Variables
Copy `.env.example` in the root folder to `.env` in the `server` directory:
```bash
cp .env.example server/.env
```
Fill out the variables inside `server/.env` (refer to [deploy-setup.md](file:///d:/New%20folder/server/docs/deploy-setup.md) for keys setup details):
* `MONGO_URI`
* `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`
* `GEMINI_API_KEY` (Google AI Studio Key)
* `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` (OAuth credentials)
* `SMTP_USER` & `SMTP_PASS` (Gmail SMTP App Password)
* `VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY` (Web Push Keys)

### 2. Installation
From the project root folder, run:
```bash
npm run install:all
```
This commands installs root, client, and server dependencies.

### 3. Run Development Servers
Start both the React web server and Express backend concurrently:
```bash
npm run dev
```
* **Frontend console:** `http://localhost:5173`
* **Backend API:** `http://localhost:5000`
