const HumanAgent = require('../models/HumanAgent');
const BotAgent = require('../models/BotAgent');
const HumanAgentInviteToken = require('../models/HumanAgentInviteToken');
const ChatBot = require('../models/ChatBot');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmailUtil');
const logger = require('../utils/logger');
const HandoffSession = require('../models/HandoffSession');

// generate invite token function
function generateToken() {
  const token = crypto.randomBytes(32).toString('hex');
  logger.debug('Generated invite token', { tokenPreview: token.substring(0, 8) });
  return token;
}

// sync bot and human agents schema data while creating and editing bot
exports.syncBotAndHumanAgents = async ({ botId, emails, invitedBy }) => {
  logger.info('Starting bot-human agent sync', {
    botId,
    invitedBy,
    emailCount: emails?.length || 0,
  });

  if (!emails || emails.length === 0) {
    logger.warn('No emails provided for bot-human agent sync', { botId });
    return;
  }

  for (const email of emails) {
    try {
      logger.info('Processing agent email', { email, botId });

      let humanAgent = await HumanAgent.findOne({ email });

      if (!humanAgent) {
        humanAgent = await HumanAgent.create({
          email,
          invitedBy,
          isPasswordSet: false,
        });

        logger.info('Created new human agent', {
          email,
          humanAgentId: humanAgent._id,
        });
      } else {
        logger.debug('Human agent already exists', {
          email,
          humanAgentId: humanAgent._id,
        });
      }

      const mapping = await BotAgent.findOneAndUpdate(
        { bot: botId, humanAgent: humanAgent._id },
        { isEnabled: true },
        { upsert: true, new: true }
      );

      logger.info('Bot-agent mapping synced', {
        botId,
        humanAgentId: humanAgent._id,
        mappingId: mapping._id,
      });

      if (!humanAgent.isPasswordSet) {
        const token = generateToken();

        await HumanAgentInviteToken.create({
          humanAgent: humanAgent._id,
          token,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        logger.info('Invite token created for agent', {
          humanAgentId: humanAgent._id,
          tokenPreview: token.substring(0, 8),
        });

        await sendEmail({
          to: email,
          subject: 'Set up your Agent Dashboard access',
          html: `
            <p>You've been invited as an agent.</p>
            <p>
              <a href="${process.env.FRONTEND_URL}/agent/set-password?token=${token}">
                Set your password
              </a>
            </p>
            <p>This link expires in 24 hours.</p>
          `,
        });

        logger.info('Invite email sent to agent', { email });
      } else {
        logger.debug('Agent already has password set, skipping invite', {
          email,
          humanAgentId: humanAgent._id,
        });
      }
    } catch (error) {
      logger.error('Failed to sync human agent for bot', {
        botId,
        email,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  logger.info('Completed bot-human agent sync', { botId });
};

// human agent set password
exports.humanAgentSetPassword = async (token, password) => {
  logger.info('Setting password for agent', { token: token.substring(0, 8) });

  // Find the invite token
  const inviteToken = await HumanAgentInviteToken.findOne({ token });

  if (!inviteToken) {
    logger.warn('Invalid token provided', { token: token.substring(0, 8) });
    throw new Error('Invalid or expired token');
  }

  // Check if token has expired
  if (new Date() > inviteToken.expiresAt) {
    logger.warn('Expired token used', {
      token: token.substring(0, 8),
      expiresAt: inviteToken.expiresAt,
    });
    throw new Error('Invalid or expired token');
  }

  // Check if token has already been used
  if (inviteToken.used) {
    logger.warn('Token already used', { token: token.substring(0, 8) });
    throw new Error('Token has already been used');
  }

  // Find the human agent
  const humanAgent = await HumanAgent.findById(inviteToken.humanAgent);

  if (!humanAgent) {
    logger.error('Agent not found for token', {
      token: token.substring(0, 8),
      agentId: inviteToken.humanAgent,
    });
    throw new Error('Agent not found');
  }

  // Check if password is already set
  if (humanAgent.isPasswordSet) {
    logger.warn('Password already set for agent', {
      agentId: humanAgent._id,
      email: humanAgent.email,
    });
    throw new Error('Password already set for this agent');
  }

  // Hash the password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Update the human agent
  humanAgent.passwordHash = passwordHash;
  humanAgent.isPasswordSet = true;
  await humanAgent.save();

  // Mark the token as used
  inviteToken.used = true;
  await inviteToken.save();

  logger.info('Password set successfully for agent', {
    agentId: humanAgent._id,
    email: humanAgent.email,
  });

  return {
    agentId: humanAgent._id,
    email: humanAgent.email,
  };
};

// human agent login
exports.humanAgentLogin = async (email, password) => {
  logger.info('Agent login attempt', { email });

  // Find the human agent
  const humanAgent = await HumanAgent.findOne({ email: email.toLowerCase() });

  if (!humanAgent) {
    logger.warn('Agent not found for login', { email });
    throw new Error('Agent not found');
  }

  // Check if password is set
  if (!humanAgent.isPasswordSet || !humanAgent.passwordHash) {
    logger.warn('Password not set for agent', { email, agentId: humanAgent._id });
    throw new Error('Password not set. Please use the invite link.');
  }

  // Check if account is active
  if (!humanAgent.isActive) {
    logger.warn('Inactive agent login attempt', {
      email,
      agentId: humanAgent._id,
    });
    throw new Error('Agent account is inactive');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, humanAgent.passwordHash);

  if (!isPasswordValid) {
    logger.warn('Invalid password for agent', { email, agentId: humanAgent._id });
    throw new Error('Invalid credentials');
  }

  // Update last login time
  humanAgent.lastLoginAt = new Date();
  await humanAgent.save();

  // Generate JWT token
  const token = jwt.sign(
    {
      id: humanAgent._id,
      email: humanAgent.email,
      type: 'human_agent',
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );

  logger.info('Agent logged in successfully', {
    agentId: humanAgent._id,
    email: humanAgent.email,
  });

  return {
    token,
    agent: humanAgent,
  };
};

// human agent verify invite token
exports.humanAgentVerifyInviteToken = async (token) => {
  logger.info('Verifying invite token', { token: token.substring(0, 8) });

  const inviteToken = await HumanAgentInviteToken.findOne({ token }).populate(
    'humanAgent'
  );

  if (!inviteToken) {
    logger.warn('Invalid token', { token: token.substring(0, 8) });
    throw new Error('Invalid or expired token');
  }

  if (new Date() > inviteToken.expiresAt) {
    logger.warn('Expired token', {
      token: token.substring(0, 8),
      expiresAt: inviteToken.expiresAt,
    });
    throw new Error('Invalid or expired token');
  }

  if (inviteToken.used) {
    logger.warn('Token already used', { token: token.substring(0, 8) });
    throw new Error('Token has already been used');
  }

  logger.info('Token verified successfully', {
    token: token.substring(0, 8),
    agentId: inviteToken.humanAgent._id,
  });

  return {
    valid: true,
    email: inviteToken.humanAgent.email,
    agentId: inviteToken.humanAgent._id,
  };
};

// get bots by human agent id
exports.getBotsByHumanAgentId = async (agentId) => {
  logger.info('Fetching bots for agent', { agentId });

  // Find all BotAgent mappings for this agent
  const botAgents = await BotAgent.find({
    humanAgent: agentId,
    isEnabled: true,
  }).populate('bot');

  const bots = botAgents.map((ba) => ba.bot).filter((bot) => bot !== null);

  logger.info('Fetched bots for agent', { agentId, count: bots.length });

  return bots;
};

// gt human agent stats by id
exports.getHumanAgentStatsById = async (agentId) => {
  try {
    const agent = await HumanAgent.findById(agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get session counts
    const totalSessions = await HandoffSession.countDocuments({
      assignedAgent: agentId,
    });

    const activeSessions = await HandoffSession.countDocuments({
      assignedAgent: agentId,
      status: { $in: ['pending', 'active'] },
    });

    const resolvedSessions = await HandoffSession.countDocuments({
      assignedAgent: agentId,
      status: 'resolved',
    });

    // Get today's sessions
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaySessions = await HandoffSession.countDocuments({
      assignedAgent: agentId,
      requestedAt: { $gte: startOfDay },
    });

    return {
      agent: {
        email: agent.email,
        displayName: agent.displayName,
        isOnline: agent.isOnline,
        availabilityStatus: agent.availabilityStatus,
        currentActiveChats: agent.currentActiveChats,
        maxConcurrentChats: agent.maxConcurrentChats,
        loadPercentage: agent.loadPercentage,
      },
      metrics: {
        totalChatsHandled: agent.totalChatsHandled,
        averageResponseTime: agent.averageResponseTime,
        averageResolutionTime: agent.averageResolutionTime,
        averageRating: agent.averageRating,
        totalRatings: agent.totalRatings,
      },
      sessions: {
        total: totalSessions,
        active: activeSessions,
        resolved: resolvedSessions,
        today: todaySessions,
      },
    };
  } catch (error) {
    logger.error('Error fetching agent stats', {
      error: error.message,
      agentId,
    });
    throw error;
  }
};

// update human agent status
exports.updateHumanAgentStatus = async (agentId, status) => {
  try {
    const updates = {
      isOnline: status.isOnline !== undefined ? status.isOnline : true,
      lastSeenAt: new Date(),
    };

    if (status.availabilityStatus) {
      updates.availabilityStatus = status.availabilityStatus;
    } else if (status.isOnline) {
      updates.availabilityStatus = 'available';
    } else {
      updates.availabilityStatus = 'offline';
    }

    const agent = await HumanAgent.findByIdAndUpdate(agentId, updates, {
      new: true,
    });

    logger.debug('Agent status updated', {
      agentId,
      email: agent?.email,
      status: updates,
    });

    return agent;
  } catch (error) {
    logger.error('Error updating agent status', {
      error: error.message,
      agentId,
    });
    throw error;
  }
};

// get human agent profile by agent id
exports.getHumanAgentProfileByAgentId = async (agentId) => {
  const agent = await HumanAgent.findById(agentId).select(
    'displayName avatarUrl phoneNumber availabilityStatus timezone skills workingHours emailNotifications soundNotifications autoAcceptChats'
  );

  if (!agent) {
    logger.warn('Agent not found while fetching profile', { agentId });
    throw new Error('Agent not found');
  }

  return agent;
};

// update human agent profile by agent id
exports.updateHumanAgentProfileByAgentId = async (agentId, data) => {
  const allowedUpdates = {
    displayName: data.displayName,
    avatarUrl: data.avatarUrl,
    phoneNumber: data.phoneNumber,
    availabilityStatus: data.availabilityStatus,
    timezone: data.timezone,
    skills: data.skills,
    workingHours: data.workingHours,
    emailNotifications: data.emailNotifications,
    soundNotifications: data.soundNotifications,
    autoAcceptChats: data.autoAcceptChats,
  };

  const agent = await HumanAgent.findByIdAndUpdate(
    agentId,
    { $set: allowedUpdates },
    { new: true }
  ).select(
    'displayName avatarUrl phoneNumber availabilityStatus timezone skills workingHours emailNotifications soundNotifications autoAcceptChats'
  );

  if (!agent) {
    logger.warn('Agent not found while updating profile', { agentId });
    throw new Error('Agent not found');
  }

  logger.info('Agent profile updated', { agentId });

  return agent;
};
