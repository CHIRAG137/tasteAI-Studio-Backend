const humanAgentService = require('../services/humanAgentService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

// human agent set password
exports.humanAgentSetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      logger.warn('Set password failed - missing token or password');
      return responseBuilder.badRequest(
        res,
        null,
        'Token and password are required'
      );
    }

    if (password.length < 8) {
      logger.warn('Set password failed - password too short');
      return responseBuilder.badRequest(
        res,
        null,
        'Password must be at least 8 characters long'
      );
    }

    const result = await humanAgentService.humanAgentSetPassword(token, password);

    logger.info('Agent password set successfully', {
      agentId: result.agentId,
      email: result.email,
    });

    return responseBuilder.ok(
      res,
      {
        agentId: result.agentId,
        email: result.email,
        message: 'Password set successfully. You can now log in.',
      },
      'Password set successfully'
    );
  } catch (error) {
    logger.error('Set password error', {
      error: error.message,
      stack: error.stack,
    });

    if (error.message === 'Invalid or expired token') {
      return responseBuilder.badRequest(res, null, error.message);
    }

    if (error.message === 'Password already set for this agent') {
      return responseBuilder.badRequest(res, null, error.message);
    }

    return responseBuilder.internalError(res, 'Failed to set password');
  }
};

// human agent login
exports.humanAgentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn('Login failed - missing email or password');
      return responseBuilder.badRequest(
        res,
        null,
        'Email and password are required'
      );
    }

    const result = await humanAgentService.humanAgentLogin(email, password);

    logger.info('Agent logged in successfully', {
      agentId: result.agent._id,
      email: result.agent.email,
    });

    return responseBuilder.ok(
      res,
      {
        token: result.token,
        agent: {
          id: result.agent._id,
          email: result.agent.email,
          isActive: result.agent.isActive,
        },
      },
      'Login successful'
    );
  } catch (error) {
    logger.error('Login error', {
      error: error.message,
      email: req.body.email,
    });

    if (
      error.message === 'Agent not found' ||
      error.message === 'Invalid credentials' ||
      error.message === 'Password not set. Please use the invite link.'
    ) {
      return responseBuilder.unauthorized(res, null, error.message);
    }

    if (error.message === 'Agent account is inactive') {
      return responseBuilder.forbidden(res, null, error.message);
    }

    return responseBuilder.internalError(res, 'Login failed');
  }
};

// human agent verify token
exports.humanAgentVerifyToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      logger.warn('Token verification failed - missing token');
      return responseBuilder.badRequest(res, null, 'Token is required');
    }

    const result = await humanAgentService.humanAgentVerifyInviteToken(token);

    logger.info('Token verified successfully', {
      agentId: result.agentId,
      email: result.email,
    });

    return responseBuilder.ok(
      res,
      {
        valid: true,
        email: result.email,
        agentId: result.agentId,
      },
      'Token is valid'
    );
  } catch (error) {
    logger.error('Token verification error', {
      error: error.message,
    });

    if (
      error.message === 'Invalid or expired token' ||
      error.message === 'Token has already been used'
    ) {
      return responseBuilder.badRequest(res, { valid: false }, error.message);
    }

    return responseBuilder.internalError(res, 'Token verification failed');
  }
};

// get chatbots by human agent id
exports.getBotsByHumanAgentId = async (req, res) => {
  try {
    const agentId = req.agent.id;

    const bots = await humanAgentService.getBotsByHumanAgentId(agentId);

    logger.info('Fetched bots for agent', {
      agentId,
      count: bots.length,
    });

    return responseBuilder.ok(
      res,
      { bots },
      'Bots fetched successfully'
    );
  } catch (error) {
    logger.error('Error fetching bots for agent', {
      error: error.message,
      agentId: req.agent?.id,
    });

    return responseBuilder.internalError(res, 'Failed to fetch bots');
  }
};

// update human agent status
exports.updateHumanAgentStatus = async (req, res) => {
  try {
    const agentId = req.agent.id;
    const { isOnline, availabilityStatus } = req.body;

    const agent = await humanAgentService.updateHumanAgentStatus(agentId, {
      isOnline,
      availabilityStatus,
    });

    logger.info('Agent status updated', {
      agentId,
      isOnline,
      availabilityStatus,
    });

    return responseBuilder.ok(
      res,
      {
        isOnline: agent.isOnline,
        availabilityStatus: agent.availabilityStatus,
        lastSeenAt: agent.lastSeenAt,
      },
      'Status updated successfully'
    );
  } catch (error) {
    logger.error('Error updating agent status', {
      error: error.message,
      agentId: req.agent?.id,
    });
    return responseBuilder.internalError(res, 'Failed to update status');
  }
};

// get human agent stats by id
exports.getHumanAgentStatsById = async (req, res) => {
  try {
    const agentId = req.agent.id;

    const stats = await humanAgentService.getHumanAgentStatsById(agentId);

    logger.info('Fetched agent stats', { agentId });

    return responseBuilder.ok(res, stats, 'Stats fetched successfully');
  } catch (error) {
    logger.error('Error fetching agent stats', {
      error: error.message,
      agentId: req.agent?.id,
    });
    return responseBuilder.internalError(res, 'Failed to fetch stats');
  }
};

// get human agent profile by agent id
exports.getHumanAgentProfileByAgentId = async (req, res) => {
  try {
    const agentId = req.agent.id;

    logger.info('Fetching agent profile', { agentId });

    const profile = await humanAgentService.getHumanAgentProfileByAgentId(agentId);

    return responseBuilder.ok(
      res,
      profile,
      'Agent profile fetched successfully'
    );
  } catch (error) {
    logger.error('Failed to fetch agent profile', {
      agentId: req.agent?.id,
      error: error.message,
    });

    return responseBuilder.internalError(
      res,
      null,
      'Failed to fetch agent profile'
    );
  }
};

// update human agent profile by agent id
exports.updateHumanAgentProfileByAgentId = async (req, res) => {
  try {
    const agentId = req.agent.id;
    const profileData = req.body;

    logger.info('Updating agent profile', {
      agentId,
      fields: Object.keys(profileData),
    });

    const updatedProfile = await humanAgentService.updateHumanAgentProfileByAgentId(
      agentId,
      profileData
    );

    return responseBuilder.ok(
      res,
      updatedProfile,
      'Agent profile updated successfully'
    );
  } catch (error) {
    logger.error('Failed to update agent profile', {
      agentId: req.agent?.id,
      error: error.message,
    });

    return responseBuilder.internalError(
      res,
      null,
      'Failed to update agent profile'
    );
  }
};

// get all human agents by bot id with comprehensive stats
exports.getAgentsByBotId = async (req, res) => {
  try {
    const { botId } = req.params;

    if (!botId) {
      logger.warn('Get agents failed - missing botId');
      return responseBuilder.badRequest(res, null, 'Bot ID is required');
    }

    const agents = await humanAgentService.getAgentsByBotId(botId);

    logger.info('Fetched agents with stats for bot', {
      botId,
      count: agents.length,
    });

    // Calculate summary statistics
    const totalAgents = agents.length;
    const activeAgents = agents.filter((a) => a.isActive).length;
    const onlineAgents = agents.filter((a) => a.isOnline).length;
    const passwordSetAgents = agents.filter((a) => a.isPasswordSet).length;

    const totalHandoffs = agents.reduce((sum, a) => sum + a.stats.totalHandoffs, 0);
    const totalResolved = agents.reduce((sum, a) => sum + a.stats.resolvedHandoffs, 0);
    const totalEscalations = agents.reduce((sum, a) => sum + a.stats.totalEscalations, 0);
    const avgResponseTime =
      agents.length > 0
        ? Math.round(
            agents.reduce((sum, a) => sum + a.stats.avgResponseTimeInSeconds, 0) /
              agents.length
          )
        : 0;

    const overallResolutionRate =
      totalHandoffs > 0 ? Math.round((totalResolved / totalHandoffs) * 100) : 0;

    return responseBuilder.ok(
      res,
      {
        botId,
        summary: {
          totalAgents,
          activeAgents,
          onlineAgents,
          passwordSetAgents,
          totalHandoffs,
          totalResolved,
          totalEscalations,
          overallResolutionRate,
          avgResponseTimeInSeconds: avgResponseTime,
        },
        agents,
      },
      'Agents with stats fetched successfully'
    );
  } catch (error) {
    logger.error('Error fetching agents with stats by bot', {
      error: error.message,
      botId: req.params?.botId,
      stack: error.stack,
    });

    return responseBuilder.internalError(res, 'Failed to fetch agents');
  }
};
