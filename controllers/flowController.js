const { attachIpAddress } = require('../middlewares/ipExtractorMiddleware');
const ChatBot = require('../models/ChatBot');
const FlowSession = require('../models/FlowSession');
const flowEngine = require('../services/flowEngineService');
const {
  enforceVisitorAuth0ForBot,
  enforceVisitorAuth0ForFlowSession,
} = require('../utils/visitorAuth0Enforce');
const { consumeAuth0SubRateLimit } = require('../utils/auth0SubRateLimiter');

/**
 * Format outputs into display-ready messages
 */
const formatMessagesForDisplay = (outputs, pausedFor = null) => {
  const messages = [];

  // Add all outputs as messages
  outputs.forEach((output) => {
    let content = '';

    if (typeof output.content === 'string') {
      content = output.content;
    } else if (output.content?.prompt) {
      content = output.content.prompt;
    } else if (output.content?.message) {
      content = output.content.message;
    } else if (output.type === 'redirect') {
      content = `Redirecting to: ${output.content}`;
    }

    // Only add messages, not questions/confirmations that were just answered
    if (output.type === 'message' || output.type === 'redirect') {
      messages.push({
        type: output.type,
        content: content,
        nodeId: output.nodeId,
        awaitingInput: false,
      });
    }
  });

  // Add the paused node as a message if waiting for input
  if (pausedFor) {
    messages.push({
      type: pausedFor.type,
      content: pausedFor.message || pausedFor.prompt || 'Please respond',
      nodeId: pausedFor.nodeId,
      options: pausedFor.options || [],
      variable: pausedFor.variable,
      awaitingInput: true, // This message requires user interaction
    });
  }

  return messages;
};

/**
 * Start a new conversation flow for a bot
 */
exports.startFlow = async (req, res) => {
  try {
    console.log('Starting flow...');
    const { botId } = req.params;

    const check = await enforceVisitorAuth0ForBot({ req, botId });
    if (!check.ok) {
      return res.status(check.status || 401).json({
        error: check.code || 'unauthorized',
        message: check.message || 'Unauthorized',
      });
    }
    const bot = check.bot;
    const decoded = check.decoded;
    const limiter = consumeAuth0SubRateLimit({
      subject: decoded?.sub,
      routeKey: 'flow:start',
      maxRequests: 40,
      windowMs: 60 * 1000,
    });
    if (!limiter.allowed) {
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many requests. Please try again shortly.',
      });
    }

    const ipAddress = req.clientIp;
    const userAgent = req.userAgent || 'Unknown';

    const session = new FlowSession({
      bot: bot._id,
      variables: {},
      ipAddress: ipAddress,
      userAgent: userAgent,
      visitorAuth0Sub: decoded?.sub || null,
      visitorEmail: decoded?.email || null,
    });

    // Find the start node
    const startNode = flowEngine.findStartNode(bot.conversationFlow);
    if (!startNode) {
      session.isFinished = true;
      await session.save();
      return res.json({
        sessionId: session._id,
        messages: [],
        awaitingInput: null,
        finished: true,
      });
    }

    // Run flow until a pause
    const runResult = await flowEngine.runFrom(
      bot.conversationFlow,
      session,
      startNode.id
    );

    // Save outputs to history with flow mode
    if (runResult.outputs && runResult.outputs.length > 0) {
      session.history.push(
        ...runResult.outputs.map((o) => ({
          mode: 'flow',
          nodeId: o.nodeId,
          type: o.type,
          content: o.content,
          timestamp: new Date(),
          fromUser: false,
        }))
      );
    }

    // Save paused node to history if exists
    if (runResult.pausedFor) {
      session.history.push({
        mode: 'flow',
        nodeId: runResult.pausedFor.nodeId,
        type: runResult.pausedFor.type,
        content: runResult.pausedFor.message || runResult.pausedFor.prompt,
        timestamp: new Date(),
        fromUser: false,
        awaitingInput: true,
      });
    }

    session.currentNodeId = runResult.pausedFor
      ? runResult.pausedFor.nodeId
      : runResult.nextNodeId;

    if (!session.currentNodeId) {
      session.isFinished = true;
    }

    // Update current mode if not in handoff
    if (session.currentMode !== 'handoff') {
      session.currentMode = 'flow';
    }

    await session.save();

    // Format response with all messages to display
    const messages = formatMessagesForDisplay(
      runResult.outputs || [],
      runResult.pausedFor
    );

    return res.json({
      sessionId: session._id,
      messages: messages,
      awaitingInput: runResult.pausedFor
        ? {
            type: runResult.pausedFor.type,
            nodeId: runResult.pausedFor.nodeId,
            variable: runResult.pausedFor.variable,
            options: runResult.pausedFor.options,
          }
        : null,
      finished: session.isFinished,
      variables: session.variables,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Respond to a flow session with user input or branch selection
 */
exports.respondToFlow = async (req, res) => {
  try {
    console.log('Responding to flow...');
    const { sessionId } = req.params;
    const { input, optionIndexOrLabel } = req.body;

    const enforced = await enforceVisitorAuth0ForFlowSession({
      req,
      flowSessionId: sessionId,
    });
    if (!enforced.ok) {
      return res.status(enforced.status || 401).json({
        error: enforced.code || 'unauthorized',
        message: enforced.message || 'Unauthorized',
      });
    }
    const session = enforced.session;
    const limiter = consumeAuth0SubRateLimit({
      subject: enforced.decoded?.sub,
      routeKey: 'flow:respond',
      maxRequests: 120,
      windowMs: 60 * 1000,
    });
    if (!limiter.allowed) {
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many messages. Please slow down.',
      });
    }

    if (session.isFinished) {
      return res.json({
        messages: [],
        awaitingInput: null,
        finished: true,
        variables: session.variables,
      });
    }

    const bot = await ChatBot.findById(session.bot);
    if (!bot) {
      return res.status(404).json({ error: 'Bot for session not found' });
    }

    const nodeMap = flowEngine.buildNodeMap(bot.conversationFlow);

    // Determine current node
    if (!session.currentNodeId) {
      const startNode = flowEngine.findStartNode(bot.conversationFlow);
      if (!startNode) {
        session.isFinished = true;
        await session.save();
        return res.json({
          messages: [],
          awaitingInput: null,
          finished: true,
        });
      }
      session.currentNodeId = startNode.id;
    }

    const waitingNode = flowEngine.getNode(nodeMap, session.currentNodeId);
    if (!waitingNode) {
      session.isFinished = true;
      await session.save();
      return res.json({
        error: 'No node to respond to; session ended',
        messages: [],
        awaitingInput: null,
        finished: true,
      });
    }

    let runResult = null;

    switch (waitingNode.type) {
      case 'branch':
        if (
          typeof optionIndexOrLabel === 'undefined' &&
          typeof input === 'undefined'
        ) {
          return res.status(400).json({
            error:
              'Please provide optionIndexOrLabel (index or label) to select branch option.',
          });
        }

        const optNodeId = flowEngine.findBranchOptionNode(
          nodeMap,
          waitingNode,
          typeof optionIndexOrLabel !== 'undefined' ? optionIndexOrLabel : input
        );

        if (!optNodeId) {
          return res
            .status(400)
            .json({ error: 'Branch option not recognized' });
        }

        // Save user choice
        session.history.push({
          mode: 'flow',
          nodeId: waitingNode.id,
          type: 'branch_select',
          content: {
            selectedOptionNodeId: optNodeId,
            selected: optionIndexOrLabel ?? input,
          },
          timestamp: new Date(),
          fromUser: true,
        });

        runResult = await flowEngine.runFrom(
          bot.conversationFlow,
          session,
          optNodeId
        );
        break;

      case 'question':
      case 'confirmation':
        if (typeof input === 'undefined') {
          return res
            .status(400)
            .json({ error: 'Please provide input for this node.' });
        }

        // Save user input
        session.history.push({
          mode: 'flow',
          nodeId: waitingNode.id,
          type: 'user_input',
          content: input,
          timestamp: new Date(),
          fromUser: true,
        });

        runResult = await flowEngine.runFrom(
          bot.conversationFlow,
          session,
          waitingNode.id,
          input
        );
        break;

      default:
        // For message, redirect, branchOption, unknown, continue flow
        runResult = await flowEngine.runFrom(
          bot.conversationFlow,
          session,
          waitingNode.id
        );
        break;
    }

    // Save outputs to history with flow mode
    if (runResult.outputs && runResult.outputs.length > 0) {
      session.history.push(
        ...runResult.outputs.map((o) => ({
          mode: 'flow',
          nodeId: o.nodeId,
          type: o.type,
          content: o.content,
          timestamp: new Date(),
          fromUser: false,
        }))
      );
    }

    // Save paused node to history if exists with flow mode
    if (runResult.pausedFor) {
      session.history.push({
        mode: 'flow',
        nodeId: runResult.pausedFor.nodeId,
        type: runResult.pausedFor.type,
        content: runResult.pausedFor.message || runResult.pausedFor.prompt,
        timestamp: new Date(),
        fromUser: false,
        awaitingInput: true,
      });
    }

    session.currentNodeId = runResult.pausedFor
      ? runResult.pausedFor.nodeId
      : runResult.nextNodeId;

    if (!session.currentNodeId) {
      session.isFinished = true;
    }

    // Update current mode if not in handoff
    if (session.currentMode !== 'handoff') {
      session.currentMode = 'flow';
    }

    await session.save();

    // Format response with all messages to display
    const messages = formatMessagesForDisplay(
      runResult.outputs || [],
      runResult.pausedFor
    );

    return res.json({
      messages: messages,
      awaitingInput: runResult.pausedFor
        ? {
            type: runResult.pausedFor.type,
            nodeId: runResult.pausedFor.nodeId,
            variable: runResult.pausedFor.variable,
            options: runResult.pausedFor.options,
          }
        : null,
      finished: session.isFinished,
      variables: session.variables,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Add a system message to flow session history
 * POST /api/flow/session/:sessionId/system-message
 * Used for handoff status messages and other system events
 */
exports.addSystemMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, messageType = 'system', handoffSessionId = null } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const session = await FlowSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Flow session not found' });
    }

    const enforced = await enforceVisitorAuth0ForFlowSession({
      req,
      flowSessionId: sessionId,
    });
    if (!enforced.ok) {
      return res.status(enforced.status || 401).json({
        error: enforced.code || 'unauthorized',
        message: enforced.message || 'Unauthorized',
      });
    }

    // Create history entry for system message
    const historyEntry = {
      mode: 'handoff',
      type: messageType,
      content: message,
      sender: 'bot',
      systemMessage: true,
      timestamp: new Date(),
      fromUser: false,
    };

    // Add handoff session ID if provided
    if (handoffSessionId) {
      historyEntry.handoffSessionId = handoffSessionId;
    }

    // Add to history
    session.history.push(historyEntry);
    await session.save();

    return res.json({
      status: 'success',
      message: 'System message added to session',
      data: historyEntry,
    });
  } catch (err) {
    console.error('Error adding system message:', err);
    return res.status(500).json({ error: err.message });
  }
};

