# Last-Minute Life Saver

An AI-powered productivity companion that proactively plans, prioritizes, and helps users complete tasks before deadlines.

## Project Structure
- `/client`: React frontend bootstrapped with Vite and Tailwind CSS.
- `/server`: Node.js + Express backend with Mongoose / MongoDB.
- `/shared`: Shared schemas and business logic (e.g. Zod validators) imported by both client and server.

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB running locally or a MongoDB Atlas connection string

### Setup Environment
1. Copy the `.env.example` in the root to a new file `.env` in the `server` directory (e.g. `server/.env`):
   ```bash
   cp .env.example server/.env
   ```
2. Populate the environment variables (especially `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `GEMINI_API_KEY`).

### Installation
From the root directory, run the installation script:
```bash
npm run install:all
```
This installs root, client, and server dependencies.

### Running in Development
To run both client and server in development mode concurrently:
```bash
npm run dev
```

The frontend will run at `http://localhost:5173` and the backend at `http://localhost:5000`.
