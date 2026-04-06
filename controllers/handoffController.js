const HandoffSession = require('../models/HandoffSession');
const humanHandoffService = require('../services/humanHandoffService');
const logger = require('../utils/logger');
const responseBuilder = require('../utils/responseBuilder');
const {
  enforceVisitorAuth0ForBot,
  enforceVisitorAuth0ForFlowSession,
} = require('../utils/visitorAuth0Enforce');
const { consumeAuth0SubRateLimit } = require('../utils/auth0SubRateLimiter');

/**
 * User requests human handoff
 * POST /api/handoff/request
 */
exports.requestHandoff = async (req, res) => {
  try {
    const { botId, flowSessionId, userQuestion, userIpAddress, userAgent } =
      req.body;

    if (!botId || !flowSessionId) {
      return responseBuilder.badRequest(
        res,
        null,
        'Bot ID and Flow Session ID are required'
      );
    }

    const botCheck = await enforceVisitorAuth0ForBot({ req, botId });
    if (!botCheck.ok) {
      return responseBuilder.unauthorized(
        res,
        { code: botCheck.code || 'unauthorized' },
        botCheck.message || 'Unauthorized'
      );
    }
    const sessionCheck = await enforceVisitorAuth0ForFlowSession({
      req,
      flowSessionId,
    });
    if (!sessionCheck.ok) {
      return responseBuilder.unauthorized(
        res,
        { code: sessionCheck.code || 'unauthorized' },
        sessionCheck.message || 'Unauthorized'
      );
    }
    if (sessionCheck.session.bot.toString() !== botId.toString()) {
      return responseBuilder.forbidden(
        res,
        null,
        'Flow session does not belong to this bot'
      );
    }
    const limiter = consumeAuth0SubRateLimit({
      subject: sessionCheck.decoded?.sub,
      routeKey: 'handoff:request',
      maxRequests: 20,
      windowMs: 60 * 1000,
    });
    if (!limiter.allowed) {
      return responseBuilder.badRequest(
        res,
        { code: 'rate_limit_exceeded' },
        'Too many handoff requests. Please wait and try again.'
      );
    }

    const result = await humanHandoffService.requestHumanHandoff({
      botId,
      flowSessionId,
      userQuestion,
      userIpAddress,
      userAgent,
    });

    logger.info('Handoff requested successfully', {
      botId,
      flowSessionId,
      handoffSessionId: result.handoffSession._id,
    });

    return responseBuilder.ok(res, result, result.message);
  } catch (error) {
    logger.error('Error requesting handoff', {
      error: error.message,
      body: req.body,
    });
    return responseBuilder.internalError(res, error.message);
  }
};

/**
 * Agent accepts a handoff session
 * POST /api/handoff/:id/accept
 */
exports.acceptHandoff = async (req, res) => {
  try {
    const { id: handoffSessionId } = req.params;
    const agentId = req.agent.id;

    const result = await humanHandoffService.acceptHandoffSession(
      agentId,
      handoffSessionId
    );

    logger.info('Handoff accepted', { agentId, handoffSessionId });

    return responseBuilder.ok(res, result, 'Handoff session accepted');
  } catch (error) {
    logger.error('Error accepting handoff', {
      error: error.message,
      agentId: req.agent?.id,
      handoffSessionId: req.params.id,
    });
    return responseBuilder.internalError(res, error.message);
  }
};

/**
 * Agent resolves a handoff session
 * POST /api/handoff/:id/resolve
 */
exports.resolveHandoff = async (req, res) => {
  try {
    const { id: handoffSessionId } = req.params;
    const agentId = req.agent.id;
    const { notes } = req.body;

    const result = await humanHandoffService.resolveHandoffSession(
      agentId,
      handoffSessionId,
      notes
    );

    logger.info('Handoff resolved', { agentId, handoffSessionId });

    return responseBuilder.ok(res, result, 'Handoff session resolved');
  } catch (error) {
    logger.error('Error resolving handoff', {
      error: error.message,
      agentId: req.agent?.id,
      handoffSessionId: req.params.id,
    });
    return responseBuilder.internalError(res, error.message);
  }
};

// get all handoff sessions for the authenticated agent including sessions that were escalated away
exports.getHumanAgentHandoffs = async (req, res) => {
  try {
    const agentId = req.agent.id;
    const {
      status = 'all',
      includeEscalated = 'true',
      page = 1,
      limit = 50,
    } = req.query;

    logger.info('Fetching human agent handoff sessions', {
      agentId,
      status,
      includeEscalated,
      page,
      limit,
    });

    const result = await humanHandoffService.getHumanAgentHandoffSessions(
      agentId,
      {
        status,
        includeEscalated: includeEscalated === 'true',
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      }
    );

    logger.info('Handoff sessions fetched successfully', {
      agentId,
      totalSessions: result.pagination?.total || result.sessions.length,
      page: result.pagination?.page,
    });

    return responseBuilder.ok(
      res,
      {
        sessions: result.sessions,
        pagination: result.pagination,
      },
      'Handoff sessions retrieved successfully'
    );
  } catch (error) {
    logger.error('Error fetching human agent handoff sessions', {
      error: error.message,
      stack: error.stack,
      agentId: req.agent?.id,
      query: req.query,
    });

    return responseBuilder.internalError(
      res,
      error.message || 'Failed to retrieve handoff sessions'
    );
  }
};

/**
 * Add message to handoff session
 * POST /api/handoff/:id/message
 */
exports.addMessage = async (req, res) => {
  try {
    const { id: handoffSessionId } = req.params;
    const agentId = req.agent.id.toString();
    const { message } = req.body;

    // Validation
    if (!message || typeof message !== 'string' || !message.trim()) {
      return responseBuilder.badRequest(res, null, 'Valid message is required');
    }

    // Check if session exists and is active
    const session = await HandoffSession.findById(handoffSessionId);
    
    if (!session) {
      return responseBuilder.notFound(res, null, 'Session not found');
    }

    if (session.status === 'resolved') {
      return responseBuilder.badRequest(res, null, 'Cannot send messages to resolved session');
    }

    if (session.status === 'pending') {
      return responseBuilder.badRequest(res, null, 'Session must be accepted first');
    }

    // Verify the agent is assigned to this session
    if (session.assignedAgent && session.assignedAgent.toString() !== agentId) {
      return responseBuilder.forbidden(res, null, 'You are not assigned to this session');
    }

    const result = await humanHandoffService.addMessageToSession(
      handoffSessionId,
      'agent',
      message.trim(),
      agentId
    );

    console.log('Message sent successfully:', {
      sessionId: handoffSessionId,
      agentId,
      messageLength: message.length
    });

    logger.info('Message added to handoff session', {
      agentId,
      handoffSessionId,
      messageCount: result.session.messages.length,
    });

    return responseBuilder.ok(res, {
      message: result.message,
      sessionId: handoffSessionId,
    }, 'Message sent successfully');

  } catch (error) {
    logger.error('Error adding message', {
      error: error.message,
      stack: error.stack,
      agentId: req.agent?.id,
      handoffSessionId: req.params.id,
    });

    // Return more specific error message in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to send message: ${error.message}`
      : 'Failed to send message';

    return responseBuilder.internalError(res, errorMessage);
  }
};

/**
 * Get messages for a handoff session
 * GET /api/handoff/:id/messages
 */
exports.getMessages = async (req, res) => {
  try {
    const { id: handoffSessionId } = req.params;
    const HandoffSession = require('../models/HandoffSession');

    const session = await HandoffSession.findById(handoffSessionId);

    if (!session) {
      return responseBuilder.notFound(res, null, 'Handoff session not found');
    }

    logger.info('Fetched handoff messages', {
      handoffSessionId,
      messageCount: session.messages.length,
    });

    return responseBuilder.ok(
      res,
      { messages: session.messages },
      'Messages fetched successfully'
    );
  } catch (error) {
    logger.error('Error fetching messages', {
      error: error.message,
      handoffSessionId: req.params.id,
    });
    return responseBuilder.internalError(res, 'Failed to fetch messages');
  }
};

exports.addClientMessage = async (req, res) => {
  try {
    const { id: handoffSessionId } = req.params;
    const { message, flowSessionId } = req.body;

    if (!message) {
      return responseBuilder.badRequest(res, null, 'Message is required');
    }

    // Verify the handoff session belongs to this flow session
    const HandoffSession = require('../models/HandoffSession');
    const session = await HandoffSession.findById(handoffSessionId);

    if (!session) {
      return responseBuilder.notFound(res, null, 'Handoff session not found');
    }

    if (session.flowSession.toString() !== flowSessionId) {
      return responseBuilder.forbidden(
        res,
        null,
        'Not authorized to send messages to this session'
      );
    }

    const sessionCheck = await enforceVisitorAuth0ForFlowSession({
      req,
      flowSessionId,
    });
    if (!sessionCheck.ok) {
      return responseBuilder.unauthorized(
        res,
        { code: sessionCheck.code || 'unauthorized' },
        sessionCheck.message || 'Unauthorized'
      );
    }
    const limiter = consumeAuth0SubRateLimit({
      subject: sessionCheck.decoded?.sub,
      routeKey: 'handoff:client-message',
      maxRequests: 120,
      windowMs: 60 * 1000,
    });
    if (!limiter.allowed) {
      return responseBuilder.badRequest(
        res,
        { code: 'rate_limit_exceeded' },
        'Too many messages. Please slow down.'
      );
    }

    const result = await humanHandoffService.addMessageToSession(
      handoffSessionId,
      'user',
      message,
      null // No agent ID for client messages
    );

    logger.info('Client message added to handoff session', {
      handoffSessionId,
      flowSessionId,
    });

    return responseBuilder.ok(res, result, 'Message sent');
  } catch (error) {
    logger.error('Error adding client message', {
      error: error.message,
      handoffSessionId: req.params.id,
    });
    return responseBuilder.internalError(res, 'Failed to send message');
  }
};

/**
 * Client gets messages for a handoff session (PUBLIC - no auth required)
 * GET /api/handoff/:id/client-messages?flowSessionId=xxx
 */
exports.getClientMessages = async (req, res) => {
  try {
    const { id: handoffSessionId } = req.params;
    const { flowSessionId } = req.query;

    if (!flowSessionId) {
      return responseBuilder.badRequest(
        res,
        null,
        'Flow Session ID is required'
      );
    }

    const HandoffSession = require('../models/HandoffSession');
    const session = await HandoffSession.findById(handoffSessionId);

    if (!session) {
      return responseBuilder.notFound(res, null, 'Handoff session not found');
    }

    // Verify the handoff session belongs to this flow session
    if (session.flowSession.toString() !== flowSessionId) {
      return responseBuilder.forbidden(
        res,
        null,
        'Not authorized to view messages for this session'
      );
    }

    const sessionCheck = await enforceVisitorAuth0ForFlowSession({
      req,
      flowSessionId,
    });
    if (!sessionCheck.ok) {
      return responseBuilder.unauthorized(
        res,
        { code: sessionCheck.code || 'unauthorized' },
        sessionCheck.message || 'Unauthorized'
      );
    }
    const limiter = consumeAuth0SubRateLimit({
      subject: sessionCheck.decoded?.sub,
      routeKey: 'handoff:client-messages',
      maxRequests: 180,
      windowMs: 60 * 1000,
    });
    if (!limiter.allowed) {
      return responseBuilder.badRequest(
        res,
        { code: 'rate_limit_exceeded' },
        'Too many polling requests. Please slow down.'
      );
    }

    logger.info('Client fetched handoff messages', {
      handoffSessionId,
      flowSessionId,
      messageCount: session.messages.length,
    });

    return responseBuilder.ok(
      res,
      {
        messages: session.messages,
        status: session.status,
        assignedAgent: session.assignedAgent,
      },
      'Messages fetched successfully'
    );
  } catch (error) {
    logger.error('Error fetching client messages', {
      error: error.message,
      handoffSessionId: req.params.id,
    });
    return responseBuilder.internalError(res, 'Failed to fetch messages');
  }
};


/**
 * Client resolves a handoff session (public)
 * POST /api/handoff/:id/client-resolve
 */
exports.resolveByClient = async (req, res) => {
  try {
    const { id: handoffSessionId } = req.params;
    const { flowSessionId } = req.body;

    if (!flowSessionId) {
      return responseBuilder.badRequest(res, null, 'Flow Session ID is required');
    }

    const sessionCheck = await enforceVisitorAuth0ForFlowSession({
      req,
      flowSessionId,
    });
    if (!sessionCheck.ok) {
      return responseBuilder.unauthorized(
        res,
        { code: sessionCheck.code || 'unauthorized' },
        sessionCheck.message || 'Unauthorized'
      );
    }
    const limiter = consumeAuth0SubRateLimit({
      subject: sessionCheck.decoded?.sub,
      routeKey: 'handoff:client-resolve',
      maxRequests: 20,
      windowMs: 60 * 1000,
    });
    if (!limiter.allowed) {
      return responseBuilder.badRequest(
        res,
        { code: 'rate_limit_exceeded' },
        'Too many requests. Please wait and try again.'
      );
    }

    const result = await humanHandoffService.resolveHandoffSessionByClient(
      flowSessionId,
      handoffSessionId
    );

    logger.info('Client resolved handoff', { handoffSessionId, flowSessionId });

    return responseBuilder.ok(res, result, 'Handoff session resolved by client');
  } catch (error) {
    logger.error('Error client resolving handoff', { error: error.message, handoffSessionId: req.params.id });
    return responseBuilder.internalError(res, error.message);
  }
};


/**
 * Client reopens a resolved handoff session (public)
 * POST /api/handoff/:id/client-reopen
 */
exports.reopenByClient = async (req, res) => {
  try {
    const { id: handoffSessionId } = req.params;
    const { flowSessionId } = req.body;

    if (!flowSessionId) {
      return responseBuilder.badRequest(res, null, 'Flow Session ID is required');
    }

    const sessionCheck = await enforceVisitorAuth0ForFlowSession({
      req,
      flowSessionId,
    });
    if (!sessionCheck.ok) {
      return responseBuilder.unauthorized(
        res,
        { code: sessionCheck.code || 'unauthorized' },
        sessionCheck.message || 'Unauthorized'
      );
    }
    const limiter = consumeAuth0SubRateLimit({
      subject: sessionCheck.decoded?.sub,
      routeKey: 'handoff:client-reopen',
      maxRequests: 20,
      windowMs: 60 * 1000,
    });
    if (!limiter.allowed) {
      return responseBuilder.badRequest(
        res,
        { code: 'rate_limit_exceeded' },
        'Too many requests. Please wait and try again.'
      );
    }

    const result = await humanHandoffService.reopenHandoffSessionByClient(
      flowSessionId,
      handoffSessionId
    );

    logger.info('Client reopened handoff', { handoffSessionId, flowSessionId });

    return responseBuilder.ok(res, result, 'Handoff session reopened by client');
  } catch (error) {
    logger.error('Error client reopening handoff', { error: error.message, handoffSessionId: req.params.id });
    return responseBuilder.internalError(res, error.message);
  }
};


/**
 * Agent reopens a resolved handoff session (agent)
 * POST /api/handoff/:id/reopen
 */
exports.reopenByAgent = async (req, res) => {
  try {
    const { id: handoffSessionId } = req.params;
    const agentId = req.agent.id;

    const result = await humanHandoffService.reopenHandoffSessionByAgent(agentId, handoffSessionId);

    logger.info('Agent reopened handoff', { agentId, handoffSessionId });

    return responseBuilder.ok(res, result, 'Handoff session reopened by agent');
  } catch (error) {
    logger.error('Error agent reopening handoff', { error: error.message, agentId: req.agent?.id, handoffSessionId: req.params.id });
    return responseBuilder.internalError(res, error.message);
  }
};

/**
 * Client rates a handoff session and provides optional feedback
 * POST /api/handoff/:id/rate
 */
exports.rateByClient = async (req, res) => {
  try {
    const { id: handoffSessionId } = req.params;
    const { flowSessionId, rating, feedback } = req.body;

    if (!flowSessionId) {
      return responseBuilder.badRequest(res, null, 'Flow Session ID is required');
    }

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return responseBuilder.badRequest(res, null, 'Rating must be an integer between 1 and 5');
    }

    const HandoffSession = require('../models/HandoffSession');
    const session = await HandoffSession.findById(handoffSessionId);
    if (!session) {
      return responseBuilder.notFound(res, null, 'Handoff session not found');
    }

    if (session.flowSession.toString() !== flowSessionId) {
      return responseBuilder.forbidden(res, null, 'Not authorized to rate this session');
    }

    const sessionCheck = await enforceVisitorAuth0ForFlowSession({
      req,
      flowSessionId,
    });
    if (!sessionCheck.ok) {
      return responseBuilder.unauthorized(
        res,
        { code: sessionCheck.code || 'unauthorized' },
        sessionCheck.message || 'Unauthorized'
      );
    }
    const limiter = consumeAuth0SubRateLimit({
      subject: sessionCheck.decoded?.sub,
      routeKey: 'handoff:rate',
      maxRequests: 30,
      windowMs: 60 * 1000,
    });
    if (!limiter.allowed) {
      return responseBuilder.badRequest(
        res,
        { code: 'rate_limit_exceeded' },
        'Too many requests. Please wait and try again.'
      );
    }

    // Save rating and feedback
    const previousRating = session.userRating || null;
    session.userRating = rating;
    if (feedback) session.userFeedback = feedback;
    await session.save();

    // Update agent aggregate rating
    const HumanAgent = require('../models/HumanAgent');
    const agent = await HumanAgent.findById(session.assignedAgent);
    if (agent) {
      if (previousRating) {
        // adjust average without changing totalRatings
        const total = agent.totalRatings || 0;
        if (total > 0) {
          agent.averageRating = ((agent.averageRating * total) - previousRating + rating) / total;
        } else {
          agent.averageRating = rating;
          agent.totalRatings = 1;
        }
      } else {
        const total = agent.totalRatings || 0;
        agent.averageRating = ((agent.averageRating * total) + rating) / (total + 1);
        agent.totalRatings = total + 1;
      }
      await agent.save();
    }

    return responseBuilder.ok(res, { success: true }, 'Rating submitted');
  } catch (error) {
    logger.error('Error submitting rating', { error: error.message, handoffSessionId: req.params.id });
    return responseBuilder.internalError(res, error.message);
  }
};

/**
 * Get existing rating for a handoff session
 * GET /api/handoff/:id/rating
 */
exports.getSessionRating = async (req, res) => {
  try {
    const { id: handoffSessionId } = req.params;
    const { flowSessionId } = req.query;

    if (!flowSessionId) {
      return responseBuilder.badRequest(res, null, 'Flow Session ID is required');
    }

    const HandoffSession = require('../models/HandoffSession');
    const session = await HandoffSession.findById(handoffSessionId);
    
    if (!session) {
      return responseBuilder.notFound(res, null, 'Handoff session not found');
    }

    if (session.flowSession.toString() !== flowSessionId) {
      return responseBuilder.forbidden(res, null, 'Not authorized to view this session');
    }

    const sessionCheck = await enforceVisitorAuth0ForFlowSession({
      req,
      flowSessionId,
    });
    if (!sessionCheck.ok) {
      return responseBuilder.unauthorized(
        res,
        { code: sessionCheck.code || 'unauthorized' },
        sessionCheck.message || 'Unauthorized'
      );
    }
    const limiter = consumeAuth0SubRateLimit({
      subject: sessionCheck.decoded?.sub,
      routeKey: 'handoff:rating',
      maxRequests: 120,
      windowMs: 60 * 1000,
    });
    if (!limiter.allowed) {
      return responseBuilder.badRequest(
        res,
        { code: 'rate_limit_exceeded' },
        'Too many requests. Please wait and try again.'
      );
    }

    logger.info('Rating retrieved for handoff session', {
      handoffSessionId,
      hasRating: !!session.userRating,
    });

    return responseBuilder.ok(res, {
      userRating: session.userRating || null,
      userFeedback: session.userFeedback || null,
    }, 'Rating retrieved successfully');
  } catch (error) {
    logger.error('Error retrieving rating', { error: error.message, handoffSessionId: req.params.id });
    return responseBuilder.internalError(res, error.message);
  }
};
