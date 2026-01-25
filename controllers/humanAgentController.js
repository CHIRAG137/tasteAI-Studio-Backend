const humanAgentService = require('../services/humanAgentService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');

exports.setPassword = async (req, res) => {
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

    const result = await humanAgentService.setPassword(token, password);

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

exports.login = async (req, res) => {
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

    const result = await humanAgentService.login(email, password);

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

exports.verifyToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      logger.warn('Token verification failed - missing token');
      return responseBuilder.badRequest(res, null, 'Token is required');
    }

    const result = await humanAgentService.verifyInviteToken(token);

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

exports.getBotsByAgent = async (req, res) => {
  try {
    const agentId = req.agent.id; // From auth middleware

    const bots = await humanAgentService.getBotsByAgent(agentId);

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

exports.updateAgentStatus = async (req, res) => {
  try {
    const agentId = req.agent.id;
    const { isOnline, availabilityStatus } = req.body;

    const agent = await humanAgentService.updateAgentStatus(agentId, {
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

exports.getAgentStats = async (req, res) => {
  try {
    const agentId = req.agent.id;

    const stats = await humanAgentService.getAgentStats(agentId);

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

exports.heartbeat = async (req, res) => {
  try {
    const agentId = req.agent.id;

    const agent = await humanAgentService.updateAgentStatus(agentId, {
      isOnline: true,
    });

    return responseBuilder.ok(
      res,
      {
        isOnline: agent.isOnline,
        currentActiveChats: agent.currentActiveChats,
        lastSeenAt: agent.lastSeenAt,
      },
      'Heartbeat received'
    );
  } catch (error) {
    logger.error('Error processing heartbeat', {
      error: error.message,
      agentId: req.agent?.id,
    });
    return responseBuilder.internalError(res, 'Heartbeat failed');
  }
};
