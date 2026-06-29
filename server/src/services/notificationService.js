import webpush from 'web-push';
import nodemailer from 'nodemailer';
import { config } from '../../config/index.js';

// Setup VAPID keys dynamically if not explicitly set in environment
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  const generated = webpush.generateVAPIDKeys();
  vapidKeys.publicKey = generated.publicKey;
  vapidKeys.privateKey = generated.privateKey;
  // Cache to env so nodemon refresh doesn't regenerate keys every tick during dev
  process.env.VAPID_PUBLIC_KEY = generated.publicKey;
  process.env.VAPID_PRIVATE_KEY = generated.privateKey;
  console.log('🔑 Dynamic VAPID keys generated and configured for web-push.');
}

webpush.setVapidDetails(
  'mailto:jeeaspirant191@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export { vapidKeys };

/**
 * Sends a premium email notifying the user of a critical task that exceeds their effort-time budget.
 * Displays a detailed weight analysis explaining why the task scored so high.
 */
export const sendEmailNotification = async (userEmail, userName, task, timeRemainingMin, weights) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      }
    });

    const isOverdue = timeRemainingMin <= 0;
    const timeRemainingStr = isOverdue 
      ? 'OVERDUE' 
      : `${Math.floor(timeRemainingMin / 60)}h ${Math.round(timeRemainingMin % 60)}m`;

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px;">
          <h1 style="color: #ef4444; font-size: 24px; margin: 0; font-weight: 800;">🚨 CRITICAL TIME DEFICIT</h1>
          <p style="color: #64748b; font-size: 14px; margin: 5px 0 0 0;">TaskPilot AI System Alert</p>
        </div>
 
        <p style="font-size: 16px; line-height: 1.6; color: #334155;">
          Hello <strong>${userName}</strong>,
        </p>
        <p style="font-size: 15px; line-height: 1.6; color: #334155;">
          Our autonomous scheduling agent has detected that you do not have enough remaining time to complete the following task before its deadline.
        </p>
 
        <div style="background: #fff5f5; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0 0 5px 0; font-size: 18px; color: #991b1b;">${task.title}</h2>
          <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
            <strong>Time Remaining:</strong> ${timeRemainingStr} | 
            <strong>Estimated Effort:</strong> ${task.estimatedMinutes} minutes
          </p>
          <p style="margin: 5px 0 0 0; font-size: 13px; color: #7f1d1d; font-style: italic;">
            <strong>AI Agent Recommendation:</strong> ${task.aiMeta?.lastReasoning || 'Start immediately to save progress.'}
          </p>
        </div>
 
        <h3 style="color: #0f172a; font-size: 16px; margin: 25px 0 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">
          ⚙️ Urgency Score Diagnostics (Risk Weight Breakdown)
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8fafc; text-align: left;">
              <th style="padding: 10px; border: 1px solid #e2e8f0; color: #475569;">Risk Factor</th>
              <th style="padding: 10px; border: 1px solid #e2e8f0; color: #475569;">Value</th>
              <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #475569;">Weight Applied</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">⏰ Time Proximity / Deficit</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${isOverdue ? 'Overdue' : weights.proximityVal}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #ef4444;">+${weights.proximityWeight}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">🔥 Priority Tier</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-transform: capitalize;">${task.priority}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #f59e0b;">+${weights.priorityWeight}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">📂 Category Weight</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-transform: capitalize;">${task.category}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #3b82f6;">+${weights.categoryWeight}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">📋 Incomplete Subtasks Ratio</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0;">${weights.incompleteRatio}</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #8b5cf6;">+${weights.subtaskWeight}</td>
            </tr>
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td colspan="2" style="padding: 12px 10px; border: 1px solid #e2e8f0; font-size: 15px;">Overall Urgency Score</td>
              <td style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: right; font-size: 16px; color: #ef4444;">${task.aiMeta?.riskScore || 0}%</td>
            </tr>
          </tbody>
        </table>
 
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px;">
          This is an automated notification from your TaskPilot AI assistant.<br/>
          To customize notification preferences, visit your app settings page.
        </div>
      </div>
    `;
 
    const mailOptions = {
      from: `"TaskPilot AI Agent" <${config.smtpUser}>`,
      to: userEmail,
      subject: `🚨 Critical Risk: "${task.title}" requires urgent attention (${task.aiMeta?.riskScore}% Risk)`,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email notification sent to ${userEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email notification:', error.message);
    return false;
  }
};

/**
 * Sends a critical task warning email template.
 */
export const sendCriticalTaskEmail = async (userEmail, taskTitle, deadline, duration) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      }
    });

    const textContent = `Hello,

Your critical task is approaching its deadline.

**Task:** ${taskTitle}
**Deadline:** ${deadline}
**Estimated Duration:** ${duration}

Based on the estimated time required, you should start working on this task now to finish before the deadline.

Open TaskPilot to view the full task details and track your progress.

Best,
**TaskPilot**
Your AI Productivity Assistant`;

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">Your critical task is approaching its deadline.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Task:</strong> ${taskTitle}</p>
          <p style="margin: 0 0 8px 0; font-size: 15px;"><strong>Deadline:</strong> ${deadline}</p>
          <p style="margin: 0; font-size: 15px;"><strong>Estimated Duration:</strong> ${duration}</p>
        </div>
        
        <p style="font-size: 16px; margin-bottom: 25px;">Based on the estimated time required, you should start working on this task now to finish before the deadline.</p>
        
        <p style="font-size: 16px; margin-bottom: 25px;">Open TaskPilot to view the full task details and track your progress.</p>
        
        <p style="font-size: 16px; margin-bottom: 0;">
          Best,<br />
          <strong>TaskPilot</strong><br />
          <span style="color: #64748b; font-size: 14px;">Your AI Productivity Assistant</span>
        </p>
      </div>
    `;

    const mailOptions = {
      from: `"TaskPilot AI Productivity Assistant" <${config.smtpUser}>`,
      to: userEmail,
      subject: `🚨 Action Required: Critical task "${taskTitle}" is approaching its deadline`,
      text: textContent,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Critical task email notification sent to ${userEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send critical task email notification:', error.message);
    return false;
  }
};


/**
 * Sends a native Web Push Notification to the user's browser subscription.
 */
export const sendWebPushNotification = async (subscription, payload) => {
  try {
    const formattedSub = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    };
    
    await webpush.sendNotification(formattedSub, JSON.stringify(payload));
    console.log(`🔔 Web push notification successfully sent to endpoint.`);
    return true;
  } catch (error) {
    console.error('❌ Web Push notification failed:', error.message);
    return false;
  }
};
