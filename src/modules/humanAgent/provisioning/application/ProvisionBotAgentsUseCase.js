'use strict';

const crypto = require('crypto');

class ProvisionBotAgentsUseCase {
  constructor({ HumanAgent, BotAgent, HumanAgentInviteToken, sendEmail }) {
    this.HumanAgent = HumanAgent;
    this.BotAgent = BotAgent;
    this.HumanAgentInviteToken = HumanAgentInviteToken;
    this.sendEmail = sendEmail;
  }

  async execute({ botId, emails, invitedBy, botName }) {
    if (!emails?.length) {
      return { agentsCount: 0, existingAgents: [] };
    }

    const existingAgents = [];

    for (const email of emails) {
      let humanAgent = await this.HumanAgent.findOne({ email });

      if (!humanAgent) {
        humanAgent = await this.HumanAgent.create({
          email,
          invitedBy,
          isPasswordSet: false,
        });
      }

      await this.BotAgent.findOneAndUpdate(
        { bot: botId, humanAgent: humanAgent._id },
        { isEnabled: true },
        { upsert: true, new: true },
      );

      if (!humanAgent.isPasswordSet) {
        const token = crypto.randomBytes(32).toString('hex');

        await this.HumanAgentInviteToken.create({
          humanAgent: humanAgent._id,
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        await this.sendEmail({
          to: email,
          subject: 'Agent Invitation',
          html: `
            <a href="${process.env.FRONTEND_URL}/agent/set-password?token=${token}">
              Accept Invitation
            </a>
          `,
        });
      } else {
        existingAgents.push(humanAgent);
      }
    }

    const displayName = botName || 'New Bot';
    for (const agent of existingAgents) {
      try {
        await this.sendEmail({
          to: agent.email,
          subject: `You've been added as an agent to ${displayName}`,
          html: `
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
          <div style="text-align:center; padding: 20px 0;">
            <h2 style="color: #064E3B; margin: 0;">You've been added as an agent</h2>
            <p style="color: #065F46; margin-top: 8px;">You can now respond to user handoff requests for <strong>${displayName}</strong>.</p>
          </div>
          <div style="background-color: #ffffff; border: 1px solid #e6f4ea; padding: 16px; border-radius: 8px;">
            <p style="margin: 0 0 12px 0; color: #374151;">Hello${agent.displayName ? ` ${agent.displayName}` : ''},</p>
            <p style="margin: 0 0 12px 0; color: #374151; line-height: 1.4;">A user has added you as a human agent for the bot <strong>${displayName}</strong>. You'll receive handoff requests from users and can respond via the Agent Dashboard.</p>
            <div style="text-align:center; margin: 18px 0;">
              <a href="${process.env.FRONTEND_URL}/agent/dashboard" style="background-color: #059669; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Open Agent Dashboard</a>
            </div>
            <p style="color: #6b7280; font-size: 13px; margin: 0;">If you have questions, contact your administrator.</p>
          </div>
        </div>
          `,
        });
      } catch {
        // Email notification failure is non-fatal
      }
    }

    return { agentsCount: emails.length, existingAgents };
  }
}

module.exports = ProvisionBotAgentsUseCase;
