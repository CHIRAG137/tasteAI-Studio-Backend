'use strict';

const crypto = require('crypto');

class ProvisionBotAgentsUseCase {
  constructor({ HumanAgent, BotAgent, HumanAgentInviteToken, sendEmail }) {
    this.HumanAgent = HumanAgent;
    this.BotAgent = BotAgent;
    this.HumanAgentInviteToken = HumanAgentInviteToken;
    this.sendEmail = sendEmail;
  }

  async execute({ botId, emails, invitedBy }) {
    if (!emails?.length) {
      return;
    }

    for (const email of emails) {
      let humanAgent = await this.HumanAgent.findOne({
        email,
      });

      if (!humanAgent) {
        humanAgent = await this.HumanAgent.create({
          email,
          invitedBy,
          isPasswordSet: false,
        });
      }

      await this.BotAgent.findOneAndUpdate(
        {
          bot: botId,
          humanAgent: humanAgent._id,
        },
        {
          isEnabled: true,
        },
        {
          upsert: true,
          new: true,
        },
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
      }
    }
  }
}

module.exports = ProvisionBotAgentsUseCase;
