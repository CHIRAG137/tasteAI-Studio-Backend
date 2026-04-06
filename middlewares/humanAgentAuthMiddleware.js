const jwt = require('jsonwebtoken');
const HumanAgent = require('../models/HumanAgent');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');
const { isTokenExpired } = require('../utils/tokenUtils');
const { verifyAuth0AccessToken } = require('../utils/auth0Verify');

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

    // 1) Try legacy internal JWT first
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      if (decoded.type === 'human_agent') {
        const agent = await HumanAgent.findById(decoded.id);
        if (!agent) {
          return responseBuilder.unauthorized(res, null, 'Agent not found');
        }

        if (isTokenExpired(agent.agentAuthTokenExpiresAt)) {
          logger.warn('Agent authentication failed - token expired', {
            agentId: agent._id,
            expiresAt: agent.agentAuthTokenExpiresAt,
          });
          agent.agentAuthToken = null;
          agent.agentAuthTokenExpiresAt = null;
          agent.isOnline = false;
          agent.availabilityStatus = 'offline';
          await agent.save();
          return responseBuilder.unauthorized(res, null, 'Token expired');
        }

        if (agent.agentAuthToken !== token) {
          return responseBuilder.unauthorized(res, null, 'Invalid token');
        }

        if (!agent.isActive) {
          return responseBuilder.forbidden(res, null, 'Agent account is inactive');
        }

        req.agent = {
          id: agent._id,
          email: agent.email,
          authProvider: 'internal_jwt',
        };
        return next();
      }
    } catch (legacyErr) {
      // Fall through to Auth0 token path.
    }

    // 2) Try Auth0 access token path
    const auth0Decoded = await verifyAuth0AccessToken(token);
    if (!auth0Decoded?.sub) {
      return responseBuilder.unauthorized(res, null, 'Invalid Auth0 token');
    }

    const auth0Email =
      typeof auth0Decoded.email === 'string' ? auth0Decoded.email.toLowerCase() : null;
    let agent = await HumanAgent.findOne({ auth0Id: auth0Decoded.sub });
    if (!agent && auth0Email) {
      // Backfill link for already-invited agents on first secured API call.
      agent = await HumanAgent.findOne({ email: auth0Email });
      if (agent && !agent.auth0Id) {
        agent.auth0Id = auth0Decoded.sub;
        await agent.save();
      }
    }

    if (!agent) {
      return responseBuilder.unauthorized(
        res,
        null,
        'No linked human agent account for this Auth0 identity'
      );
    }

    if (!agent.isActive) {
      return responseBuilder.forbidden(res, null, 'Agent account is inactive');
    }

    req.agent = {
      id: agent._id,
      email: agent.email,
      authProvider: 'auth0',
      auth0Sub: auth0Decoded.sub,
    };
    return next();
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
