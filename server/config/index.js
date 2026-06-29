import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env file from server root or parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });
// fallback to root level if not in server/
dotenv.config({ path: path.join(__dirname, '../../.env') });

const requiredEnvVars = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'GEMINI_API_KEY',
  'CLIENT_URL',
  'AGENT_TICK_SECRET',  // Shared secret for Cloud Scheduler → /api/agent/tick
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALENDAR_REDIRECT_URI',
  'CALENDAR_TOKEN_ENCRYPTION_KEY',
];

const missing = [];
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    missing.push(key);
  }
});

if (missing.length > 0) {
  console.error('\n❌ CRITICAL INITIALIZATION ERROR: Missing environment variables!');
  console.error(`Please define the following inside server/.env: ${missing.join(', ')}\n`);
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  geminiApiKey: process.env.GEMINI_API_KEY,
  clientUrl: process.env.CLIENT_URL,
  agentTickSecret: process.env.AGENT_TICK_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCalendarRedirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI,
  calendarTokenEncryptionKey: process.env.CALENDAR_TOKEN_ENCRYPTION_KEY,
  smtpUser: process.env.SMTP_USER || 'jeeaspirant191@gmail.com',
  smtpPass: process.env.SMTP_PASS || 'drys ucuu uwvl hetc',
};
