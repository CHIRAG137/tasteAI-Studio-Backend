const jwt = require('jsonwebtoken');
const HumanAgent = require('../models/HumanAgent');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');
const { isTokenExpired } = require('../utils/tokenUtils');

exports.authenticateHumanAgent = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Agent authentication failed - no token provided');
      return responseBuilder.unauthorized(
        res,
        null,
        'Access denied. No token provided.'
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );

    // Check if token is for human agent
    if (decoded.type !== 'human_agent') {
      logger.warn('Agent authentication failed - invalid token type', {
        type: decoded.type,
      });
      return responseBuilder.unauthorized(
        res,
        null,
        'Invalid token type'
      );
    }

    // Find the agent
    const agent = await HumanAgent.findById(decoded.id);

    if (!agent) {
      logger.warn('Agent authentication failed - agent not found', {
        agentId: decoded.id,
      });
      return responseBuilder.unauthorized(
        res,
        null,
        'Agent not found'
      );
    }

    // Check if token is expired in the database
    if (isTokenExpired(agent.agentAuthTokenExpiresAt)) {
      logger.warn('Agent authentication failed - token expired', {
        agentId: agent._id,
        expiresAt: agent.agentAuthTokenExpiresAt,
      });
      // Clear expired token from database
      agent.agentAuthToken = null;
      agent.agentAuthTokenExpiresAt = null;
      agent.isOnline = false;
      agent.availabilityStatus = 'offline';
      await agent.save();
      return responseBuilder.unauthorized(res, null, 'Token expired');
    }

    // Check if token in header matches token in database
    if (agent.agentAuthToken !== token) {
      logger.warn('Agent authentication failed - token mismatch', {
        agentId: agent._id,
      });
      return responseBuilder.unauthorized(res, null, 'Invalid token');
    }

    // Check if agent is active
    if (!agent.isActive) {
      logger.warn('Agent authentication failed - agent inactive', {
        agentId: agent._id,
        email: agent.email,
      });
      return responseBuilder.forbidden(
        res,
        null,
        'Agent account is inactive'
      );
    }

    // Attach agent to request
    req.agent = {
      id: agent._id,
      email: agent.email,
    };

    next();
  } catch (error) {
    logger.error('Agent authentication error', {
      error: error.message,
      stack: error.stack,
    });

    if (error.name === 'JsonWebTokenError') {
      return responseBuilder.unauthorized(
        res,
        null,
        'Invalid token'
      );
    }

    if (error.name === 'TokenExpiredError') {
      return responseBuilder.unauthorized(
        res,
        null,
        'Token expired'
      );
    }

    return responseBuilder.internalError(
      res,
      'Authentication failed'
    );
  }
};
