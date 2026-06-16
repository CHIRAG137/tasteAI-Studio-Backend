// Run this script periodically (cron) to send reminder emails for invite tokens
// Usage: node scripts/inviteReminderCron.js

require('dotenv').config();
const mongoose = require('mongoose');
const HumanAgentInviteToken = require('../models/HumanAgentInviteToken');
const HumanAgent = require('../models/HumanAgent');
const sendEmail = require('../utils/sendEmailUtil');
const logger = require('../utils/logger');

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('Invite reminder cron started');

    // Find tokens that are unused, haven't had a reminder sent, and expire within next 12 hours
    const now = new Date();
    const in12h = new Date(Date.now() + 12 * 60 * 60 * 1000);

    const tokens = await HumanAgentInviteToken.find({
      used: false,
      reminderSent: { $ne: true },
      expiresAt: { $lte: in12h, $gte: now },
    }).lean();

    logger.info('Invite tokens found for reminder', { count: tokens.length });

    for (const tokenDoc of tokens) {
      try {
        const agent = await HumanAgent.findById(tokenDoc.humanAgent).lean();
        if (!agent) {
          logger.warn('Agent not found for invite token', { tokenId: tokenDoc._id });
          continue;
        }

        if (!agent.email) {
          continue;
        }

        // send reminder email
        await sendEmail({
          to: agent.email,
          subject: 'Reminder: Set up your Agent Dashboard access',
          html: `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
          <div style="text-align:center; padding: 20px 0;">
            <h2 style="color: #064E3B; margin: 0;">Reminder: Set up your Agent Dashboard</h2>
            <p style="color: #065F46; margin-top: 8px;">Your invite will expire soon — please set your password to activate your account.</p>
          </div>
          <div style="background-color: #ffffff; border: 1px solid #e6f4ea; padding: 16px; border-radius: 8px;">
            <p style="margin: 0 0 12px 0; color: #374151;">Hi${agent.displayName ? ` ${agent.displayName}` : ''},</p>
            <p style="margin: 0 0 12px 0; color: #374151; line-height: 1.4;">You were invited to TasteAI Studio as an agent. Please set your password using the link below before the invite expires.</p>
            <div style="text-align:center; margin: 18px 0;">
              <a href="${process.env.FRONTEND_URL}/agent/set-password?token=${tokenDoc.token}" style="background-color: #059669; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Set your password</a>
            </div>
            <p style="margin: 0; color: #6b7280; font-size: 13px;">This invitation expires at ${new Date(tokenDoc.expiresAt).toLocaleString()}.</p>
          </div>
        </div>
          `,
        });

        await HumanAgentInviteToken.findByIdAndUpdate(tokenDoc._id, { reminderSent: true });
        logger.info('Invite reminder sent', { email: agent.email, tokenId: tokenDoc._id });
      } catch (err) {
        logger.error('Error sending invite reminder for token', {
          tokenId: tokenDoc._id,
          error: err.message,
        });
      }
    }

    logger.info('Invite reminder cron finished');
    await mongoose.disconnect();
  } catch (err) {
    logger.error('Invite reminder cron failed', { error: err.message });
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
  }
}

main();
