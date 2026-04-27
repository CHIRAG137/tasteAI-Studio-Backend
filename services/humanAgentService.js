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
const axios = require('axios');
const { verifyAuth0AccessToken } = require('../utils/auth0Verify');
const googleClient = require('../config/googleClient');
const { sanitizeBotForResponse, sanitizeBotsForResponse } = require('../utils/botSanitizer');

async function fetchAuth0UserInfo(accessToken) {
  const domain = process.env.AUTH0_DOMAIN;
  const { data } = await axios.get(`https://${domain}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });
  return data;
}

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
        <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
          <div style="text-align:center; padding: 24px 0;">
            <h2 style="color: #064E3B; margin: 0;">Set up your Agent Dashboard access</h2>
            <p style="color: #065F46; margin-top: 8px;">Welcome to TasteAI Studio — you're invited to join our agent team.</p>
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e6f4ea; padding: 18px; border-radius: 8px;">
            <p style="margin: 0 0 12px 0; color: #111827;">Hi there,</p>
            <p style="margin: 0 0 12px 0; color: #374151; line-height: 1.4;">An administrator has invited you to access the Agent Dashboard so you can respond to user handoff requests and manage conversations.</p>

            <div style="background-color: #f0fdf4; padding: 12px 14px; border-radius: 6px; margin: 14px 0;">
              <p style="margin: 0; color: #065F46;"><strong>What to do next</strong></p>
              <p style="margin: 8px 0 0 0; color: #065F46;">Click the button below to set your password and access the dashboard. This link will expire in 24 hours.</p>
            </div>

            <div style="text-align:center; margin: 18px 0;">
              <a href="${process.env.FRONTEND_URL}/agent/set-password?token=${token}" style="background-color: #059669; color: #ffffff; padding: 12px 22px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Set your password &amp; open dashboard</a>
            </div>

            <p style="margin: 0 0 8px 0; color: #6b7280;">If the button doesn't work, copy and paste the following URL into your browser:</p>
            <p style="word-break: break-all; color: #111827; margin: 6px 0 0 0; font-size: 13px;">${process.env.FRONTEND_URL}/agent/set-password?token=${token}</p>

            <hr style="border: none; border-top: 1px solid #eef2f7; margin: 18px 0;" />

            <p style="color: #374151; font-size: 13px; margin: 0;">If you did not expect this invitation, you can safely ignore this message or contact your administrator.</p>
          </div>

          <p style="margin-top: 18px; color: #9ca3af; font-size: 12px;">This is an automated message from TasteAI Studio.</p>
        </div>
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

  // Store token and expiry in database
  humanAgent.agentAuthToken = token;
  humanAgent.agentAuthTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await humanAgent.save();

  logger.info('Agent logged in successfully', {
    agentId: humanAgent._id,
    email: humanAgent.email,
  });

  return {
    token,
    agent: humanAgent,
  };
};

// human agent login via Auth0 (must already be an invited agent; same email as invite)
exports.humanAgentAuth0Login = async (accessToken) => {
  const decoded = await verifyAuth0AccessToken(accessToken);
  const auth0Sub = decoded.sub;

  let email = decoded.email;
  let name = decoded.name || decoded.nickname;

  if (!email) {
    const info = await fetchAuth0UserInfo(accessToken);
    email = info.email;
    name = name || info.name || info.nickname;
  }

  if (!email) {
    throw new Error(
      'Could not resolve email from Auth0 — use openid profile email scopes',
    );
  }

  const normalizedEmail = email.toLowerCase();
  const humanAgent = await HumanAgent.findOne({ email: normalizedEmail });

  if (!humanAgent) {
    logger.warn('Auth0 agent login — no agent record', { email: normalizedEmail });
    throw new Error(
      'No agent account for this email. Ask a bot owner to add you as a human agent.',
    );
  }

  if (!humanAgent.isActive) {
    throw new Error('Agent account is inactive');
  }

  if (humanAgent.auth0Id && humanAgent.auth0Id !== auth0Sub) {
    throw new Error(
      'This agent profile is linked to a different Auth0 account',
    );
  }

  if (!humanAgent.auth0Id) {
    humanAgent.auth0Id = auth0Sub;
  }

  if (name && !humanAgent.displayName) {
    humanAgent.displayName = name;
  }

  humanAgent.lastLoginAt = new Date();

  const token = jwt.sign(
    {
      id: humanAgent._id,
      email: humanAgent.email,
      type: 'human_agent',
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' },
  );

  humanAgent.agentAuthToken = token;
  humanAgent.agentAuthTokenExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );
  await humanAgent.save();

  logger.info('Agent Auth0 login successful', {
    agentId: humanAgent._id,
    email: humanAgent.email,
  });

  return { token, agent: humanAgent };
};

// human agent login via Google
exports.humanAgentGoogleLogin = async (googleToken) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    const normalizedEmail = email.toLowerCase();
    const humanAgent = await HumanAgent.findOne({ email: normalizedEmail });

    if (!humanAgent) {
      logger.warn('Google agent login — no agent record', { email: normalizedEmail });
      throw new Error(
        'No agent account for this email. Ask a bot owner to add you as a human agent.',
      );
    }

    if (!humanAgent.isActive) {
      throw new Error('Agent account is inactive');
    }

    if (humanAgent.googleId && humanAgent.googleId !== googleId) {
      throw new Error(
        'This agent profile is linked to a different Google account',
      );
    }

    if (!humanAgent.googleId) {
      humanAgent.googleId = googleId;
    }

    if (name && !humanAgent.displayName) {
      humanAgent.displayName = name;
    }

    humanAgent.lastLoginAt = new Date();

    const token = jwt.sign(
      {
        id: humanAgent._id,
        email: humanAgent.email,
        type: 'human_agent',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' },
    );

    humanAgent.agentAuthToken = token;
    humanAgent.agentAuthTokenExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );
    await humanAgent.save();

    logger.info('Agent Google login successful', {
      agentId: humanAgent._id,
      email: humanAgent.email,
    });

    return { token, agent: humanAgent };
  } catch (err) {
    logger.error('Error in Google agent login service', { error: err.message });
    throw err;
  }
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

  // Fetch all bot-agent mappings for this human agent
  const botAgents = await BotAgent.find({
    humanAgent: agentId,
  }).populate('bot');

  const enabledBots = [];
  const disabledBots = [];

  for (const ba of botAgents) {
    if (!ba.bot) continue;

    if (ba.isEnabled) {
      enabledBots.push(ba.bot);
    } else {
      disabledBots.push(ba.bot);
    }
  }

  logger.info('Fetched bots for agent', {
    agentId,
    enabledCount: enabledBots.length,
    disabledCount: disabledBots.length,
  });

  return {
    enabledBots: sanitizeBotsForResponse(enabledBots),
    disabledBots: sanitizeBotsForResponse(disabledBots),
  };
};

exports.getHumanAgentStatsById = async (agentId) => {
  try {
    const agent = await HumanAgent.findById(agentId);

    if (!agent) {
      throw new Error('Agent not found');
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      // Session stats - only sessions currently assigned to agent
      totalSessionsAssigned,
      activeSessionsAssigned,
      resolvedSessionsAssigned,
      todayResolvedSessions,

      // Escalation stats - sessions that came via escalation
      totalEscalatedToAgent,
      currentlyActiveEscalated,
      totalEscalatedAway,
      resolvedEscalatedSessions,
      
      // Escalation reason breakdown
      escalationReasonsRaw,
    ] = await Promise.all([
      // Total sessions ever assigned to this agent (current assignee)
      HandoffSession.countDocuments({ 
        assignedAgent: agentId 
      }),

      // Active/pending sessions currently assigned to this agent
      HandoffSession.countDocuments({
        assignedAgent: agentId,
        status: { $in: ['pending', 'active'] },
      }),

      // Resolved sessions currently assigned to this agent
      HandoffSession.countDocuments({
        assignedAgent: agentId,
        status: 'resolved',
      }),

      // Sessions resolved today by this agent
      HandoffSession.countDocuments({
        assignedAgent: agentId,
        status: 'resolved',
        resolvedAt: { $gte: startOfDay },
      }),

      // Total sessions escalated TO this agent (currently assigned + has escalation history)
      HandoffSession.countDocuments({
        assignedAgent: agentId,
        escalated: true,
        'escalationHistory.newAgent': agentId,
      }),

      // Currently active/pending sessions that were escalated to this agent
      HandoffSession.countDocuments({
        assignedAgent: agentId,
        escalated: true,
        'escalationHistory.newAgent': agentId,
        status: { $in: ['pending', 'active'] },
      }),

      // Total sessions escalated AWAY from this agent (in escalation history as previous agent)
      HandoffSession.countDocuments({
        'escalationHistory.previousAgent': agentId,
      }),

      // Resolved sessions that were escalated to this agent
      HandoffSession.countDocuments({
        assignedAgent: agentId,
        escalated: true,
        'escalationHistory.newAgent': agentId,
        status: 'resolved',
      }),

      // Escalation reason breakdown for sessions escalated away
      HandoffSession.aggregate([
        { $unwind: '$escalationHistory' },
        {
          $match: {
            'escalationHistory.previousAgent': agentId,
          },
        },
        {
          $group: {
            _id: '$escalationHistory.reason',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const escalationReasons = escalationReasonsRaw.reduce((acc, item) => {
      acc[item._id || 'unknown'] = item.count;
      return acc;
    }, {});

    logger.info('Human agent stats computed', { agentId });

    return {
      agent: {
        email: agent.email,
        displayName: agent.displayName,
        isOnline: agent.isOnline,
        availabilityStatus: agent.availabilityStatus,
        currentActiveChats: agent.currentActiveChats, // Sessions in active/pending state assigned to agent
        maxConcurrentChats: agent.maxConcurrentChats,
        loadPercentage: agent.loadPercentage,
      },

      metrics: {
        totalChatsHandled: agent.totalChatsHandled, // Sessions resolved by agent
        averageResponseTime: agent.averageResponseTime,
        averageResolutionTime: agent.averageResolutionTime,
        averageRating: agent.averageRating,
        totalRatings: agent.totalRatings,
      },

      sessions: {
        total: totalSessionsAssigned, // Total sessions assigned to agent (any status)
        active: activeSessionsAssigned, // Sessions in pending/active assigned to agent
        resolved: resolvedSessionsAssigned, // Sessions in resolved status assigned to agent
        today: todayResolvedSessions, // Sessions resolved today assigned to agent
      },

      escalations: {
        totalAssigned: totalEscalatedToAgent, // Total sessions assigned by escalation
        currentlyActive: currentlyActiveEscalated, // Active/pending sessions assigned by escalation
        escalatedAway: totalEscalatedAway, // Total sessions escalated away from agent
        escalatedTo: totalEscalatedToAgent, // Total sessions assigned to agent by escalation (same as totalAssigned)
        resolvedByAgent: resolvedEscalatedSessions, // Resolved sessions that were escalated to agent
        byReason: escalationReasons, // Breakdown by escalation reason
      },
    };
  } catch (error) {
    logger.error('Error fetching human agent stats', {
      error: error.message,
      stack: error.stack,
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

// Get all agents by bot id with comprehensive stats
exports.getAgentsByBotId = async (botId) => {
  logger.info('Fetching agents with stats for bot', { botId });

  try {
    // Find all bot-agent mappings for this bot
    const botAgents = await BotAgent.find({
      bot: botId,
      isEnabled: true,
    }).populate('humanAgent');

    if (!botAgents || botAgents.length === 0) {
      logger.info('No agents found for bot', { botId });
      return [];
    }

    // Get agent IDs
    const agentIds = botAgents.map((ba) => ba.humanAgent._id);

    // Fetch all handoff sessions for these agents
    const handoffSessions = await HandoffSession.find({
      bot: botId,
      $or: [
        { assignedAgent: { $in: agentIds } },
        { 'escalationHistory.previousAgent': { $in: agentIds } },
      ],
    });

    // Build comprehensive stats for each agent
    const agentsWithStats = botAgents.map((botAgent) => {
      const agent = botAgent.humanAgent;
      const agentId = agent._id;

      // Filter handoff sessions for this specific agent
      const agentSessions = handoffSessions.filter(
        (session) =>
          session.assignedAgent.toString() === agentId.toString() ||
          session.escalationHistory.some(
            (esc) => esc.previousAgent.toString() === agentId.toString()
          )
      );

      // Calculate stats
      const totalHandoffs = agentSessions.length;
      const resolvedHandoffs = agentSessions.filter(
        (s) => s.status === 'resolved'
      ).length;
      const activeHandoffs = agentSessions.filter(
        (s) => s.status === 'active'
      ).length;
      const pendingHandoffs = agentSessions.filter(
        (s) => s.status === 'pending'
      ).length;
      const abandonedHandoffs = agentSessions.filter(
        (s) => s.status === 'abandoned'
      ).length;
      const transferredHandoffs = agentSessions.filter(
        (s) => s.status === 'transferred'
      ).length;

      // Calculate escalations
      const escalatedSessions = agentSessions.filter((s) => s.escalated);
      const totalEscalations = escalatedSessions.length;

      // Calculate average response time from sessions that have this metric
      const sessionsWithResponseTime = agentSessions.filter(
        (s) => s.responseTime !== undefined && s.responseTime !== null
      );
      const avgResponseTime =
        sessionsWithResponseTime.length > 0
          ? Math.round(
              sessionsWithResponseTime.reduce((sum, s) => sum + s.responseTime, 0) /
                sessionsWithResponseTime.length
            )
          : 0;

      // Calculate average resolution time
      const sessionsWithResolutionTime = agentSessions.filter(
        (s) => s.resolutionTime !== undefined && s.resolutionTime !== null
      );
      const avgResolutionTime =
        sessionsWithResolutionTime.length > 0
          ? Math.round(
              sessionsWithResolutionTime.reduce(
                (sum, s) => sum + s.resolutionTime,
                0
              ) / sessionsWithResolutionTime.length
            )
          : 0;

      // Calculate resolution rate
      const resolutionRate =
        totalHandoffs > 0
          ? Math.round((resolvedHandoffs / totalHandoffs) * 100)
          : 0;

      // Calculate escalation rate
      const escalationRate =
        totalHandoffs > 0
          ? Math.round((totalEscalations / totalHandoffs) * 100)
          : 0;

      // Get average rating from sessions that have ratings
      const sessionsWithRating = agentSessions.filter(
        (s) => s.userRating !== undefined && s.userRating !== null
      );
      const avgUserRating =
        sessionsWithRating.length > 0
          ? (
              sessionsWithRating.reduce((sum, s) => sum + s.userRating, 0) /
              sessionsWithRating.length
            ).toFixed(2)
          : 0;

      return {
        // Agent basic info
        agentId: agent._id,
        email: agent.email,
        displayName: agent.displayName || 'N/A',
        avatarUrl: agent.avatarUrl || null,
        phoneNumber: agent.phoneNumber || null,

        // Account status
        isActive: agent.isActive,
        isPasswordSet: agent.isPasswordSet,
        isOnline: agent.isOnline,
        availabilityStatus: agent.availabilityStatus,
        lastSeenAt: agent.lastSeenAt,
        lastLoginAt: agent.lastLoginAt,

        // Capacity info
        totalChatsAssigned: agent.totalChatsAssigned,
        currentActiveChats: agent.currentActiveChats,
        maxConcurrentChats: agent.maxConcurrentChats,
        loadPercentage: Math.round(
          (agent.currentActiveChats / agent.maxConcurrentChats) * 100
        ),
        hasCapacity: agent.currentActiveChats < agent.maxConcurrentChats,

        // Performance metrics
        averageResponseTime: agent.averageResponseTime || avgResponseTime,
        averageResolutionTime:
          agent.averageResolutionTime || avgResolutionTime,
        averageRating: agent.averageRating || avgUserRating,
        totalRatings: agent.totalRatings,

        // Handoff statistics
        stats: {
          totalHandoffs,
          resolvedHandoffs,
          activeHandoffs,
          pendingHandoffs,
          abandonedHandoffs,
          transferredHandoffs,
          resolutionRate,
          totalEscalations,
          escalationRate,
          avgResponseTimeInSeconds: avgResponseTime,
          avgResolutionTimeInSeconds: avgResolutionTime,
          avgUserRating: parseFloat(avgUserRating),
          totalRatingsReceived: sessionsWithRating.length,
        },

        // Skills and availability
        skills: agent.skills || [],
        timezone: agent.timezone,
        workingHours: agent.workingHours,

        // Preferences
        emailNotifications: agent.emailNotifications,
        soundNotifications: agent.soundNotifications,
        autoAcceptChats: agent.autoAcceptChats,

        // Metadata
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      };
    });

    logger.info('Fetched agents with stats for bot', {
      botId,
      agentCount: agentsWithStats.length,
    });

    return agentsWithStats;
  } catch (error) {
    logger.error('Error fetching agents with stats for bot', {
      error: error.message,
      botId,
      stack: error.stack,
    });
    throw error;
  }
};

// human agent logout
exports.humanAgentLogout = async (agentId) => {
  logger.info('Agent logout attempt', { agentId });

  try {
    const agent = await HumanAgent.findByIdAndUpdate(
      agentId,
      { 
        lastLogoutAt: new Date(),
        agentAuthToken: null,
        agentAuthTokenExpiresAt: null,
        isOnline: false,
        availabilityStatus: 'offline'
      },
      { new: true }
    );

    if (!agent) {
      logger.warn('Agent not found for logout', { agentId });
      throw new Error('Agent not found');
    }

    logger.info('Agent logged out successfully', { 
      agentId: agent._id,
      email: agent.email 
    });

    return {
      message: 'Logout successful',
      agent
    };
  } catch (error) {
    logger.error('Logout error', { agentId, error: error.message });
    throw error;
  }
};
