const HumanAgent = require('../models/HumanAgent');
const BotAgent = require('../models/BotAgent');
const HumanAgentInviteToken = require('../models/HumanAgentInviteToken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmailUtil');

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

exports.syncBotAndHumanAgents = async ({ botId, emails, invitedBy }) => {
  if (!emails || emails.length === 0) return;

  for (const email of emails) {
    let humanAgent = await HumanAgent.findOne({ email });

    if (!humanAgent) {
      humanAgent = await HumanAgent.create({
        email,
        invitedBy,
        isPasswordSet: false,
      });
    }

    const mapping = await BotAgent.findOneAndUpdate(
      { bot: botId, humanAgent: humanAgent._id },
      { isEnabled: true },
      { upsert: true, new: true }
    );

    if (!humanAgent.isPasswordSet) {
      const token = generateToken();

      await HumanAgentInviteToken.create({
        humanAgent: humanAgent._id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await sendEmail({
        to: email,
        subject: 'Set up your Agent Dashboard access',
        html: `
          <p>You’ve been invited as an agent.</p>
          <p>
            <a href="${process.env.FRONTEND_URL}/agent/set-password?token=${token}">
              Set your password
            </a>
          </p>
          <p>This link expires in 24 hours.</p>
        `,
      });
    }
  }
};
