const HumanAgent = require('../models/HumanAgent');
const BotAgent = require('../models/BotAgent');
const HandoffSession = require('../models/HandoffSession');
const FlowSession = require('../models/FlowSession');
const ChatBot = require('../models/ChatBot');
const logger = require('../utils/logger');
const sendEmail = require('../utils/sendEmailUtil');

// Global round-robin counter per bot (in-memory, could be Redis in production)
const roundRobinCounters = new Map();

/**
 * Main entry point: Request human handoff
 */
exports.requestHumanHandoff = async ({
  botId,
  flowSessionId,
  userQuestion = '',
  userIpAddress = '',
  userAgent = '',
}) => {
  try {
    logger.info('Human handoff requested', { botId, flowSessionId });

    // 1. Validate bot has handoff enabled
    const bot = await ChatBot.findById(botId);
    if (!bot || !bot.human_handoff_enabled) {
      logger.warn('Human handoff not enabled', { botId });
      throw new Error('Human handoff not enabled for this bot');
    }

    // 2. Check if session already has an active handoff
    const existingHandoff = await HandoffSession.findOne({
      flowSession: flowSessionId,
      status: { $in: ['pending', 'active'] },
    });

    if (existingHandoff) {
      logger.info('Handoff session already exists', {
        flowSessionId,
        handoffSessionId: existingHandoff._id,
      });
      return {
        success: true,
        handoffSession: existingHandoff,
        alreadyExists: true,
        message: 'Your request is being processed',
      };
    }

    // 3. Get all eligible agents for this bot
    const eligibleAgents = await getEligibleAgents(botId);

    if (eligibleAgents.length === 0) {
      logger.error('No agents configured', { botId });
      throw new Error('No agents are available for this bot');
    }

    // 4. Find best agent using smart assignment
    const assignmentResult = await findBestAgent(eligibleAgents, botId);

    // 5. Create handoff session
    const handoffSession = await HandoffSession.create({
      bot: botId,
      flowSession: flowSessionId,
      assignedAgent: assignmentResult.agent._id,
      userQuestion,
      userIpAddress,
      userAgent,
      status: 'pending',
      assignmentMethod: assignmentResult.method,
    });

    // 6. Increment agent chat count (ATOMIC)
    await HumanAgent.findByIdAndUpdate(
      assignmentResult.agent._id,
      { $inc: { totalChatsAssigned: 1 } },
      { new: false }
    );

    const agent = assignmentResult.agent;

    const shouldAutoAccept =
      agent.autoAcceptChats && agent.isAvailableForChat();

    if (shouldAutoAccept) {
      await HumanAgent.findByIdAndUpdate(
        agent._id,
        { $inc: { currentActiveChats: 1 } },
        { new: true }
      );

      if (updatedAgent.currentActiveChats >= updatedAgent.maxConcurrentChats) {
        await HumanAgent.findByIdAndUpdate(agent._id, {
          availabilityStatus: 'busy',
        });
      }

      await HandoffSession.findByIdAndUpdate(handoffSession._id, {
        status: 'active',
        acceptedAt: new Date(),
      });
    }

    // 7. Send notifications
    await sendHandoffNotifications(
      handoffSession,
      assignmentResult,
      eligibleAgents
    );

    // 8. Update flow session
    await FlowSession.findByIdAndUpdate(flowSessionId, {
      human_handoff_requested: true,
      human_handoff_session: handoffSession._id,
      human_handoff_agent: assignmentResult.agent._id,
      currentMode: 'handoff',
      activeHandoffSessionId: handoffSession._id,
      $push: {
        history: {
          mode: 'handoff',
          type: 'handoff_initiated',
          content: userQuestion,
          agentAssigned: assignmentResult.agent._id,
          handoffSessionId: handoffSession._id,
          timestamp: new Date(),
          fromUser: true,
        },
      },
    });

    logger.info('Human handoff session created', {
      handoffSessionId: handoffSession._id,
      assignedAgent: assignmentResult.agent.email,
      method: assignmentResult.method,
      agentOnline: assignmentResult.agent.isOnline,
    });

    return {
      success: true,
      handoffSession,
      agent: {
        id: assignmentResult.agent._id,
        email: assignmentResult.agent.email,
        isOnline: assignmentResult.agent.isOnline,
      },
      method: assignmentResult.method,
      message: assignmentResult.agent.isOnline
        ? 'An agent will be with you shortly'
        : 'Your request has been received. An agent will respond as soon as possible.',
    };
  } catch (error) {
    logger.error('Error in requestHumanHandoff', {
      error: error.message,
      botId,
      flowSessionId,
    });
    throw error;
  }
};

/**
 * Get all eligible agents for a bot
 */
async function getEligibleAgents(botId) {
  const botAgents = await BotAgent.find({
    bot: botId,
    isEnabled: true,
  }).populate({
    path: 'humanAgent',
    match: {
      isActive: true,
      isPasswordSet: true, // Only agents who have set password
    },
  });

  // Filter out null humanAgent entries
  const eligibleAgents = botAgents
    .filter((ba) => ba.humanAgent !== null)
    .map((ba) => ba.humanAgent);

  logger.debug('Eligible agents found', {
    botId,
    count: eligibleAgents.length,
    agents: eligibleAgents.map((a) => ({
      email: a.email,
      isOnline: a.isOnline,
      status: a.availabilityStatus,
      activeChats: a.currentActiveChats,
    })),
  });

  return eligibleAgents;
}

/**
 * Smart agent assignment algorithm
 * Priority:
 * 1. Online + Available + Has Capacity → Least Busy
 * 2. All agents (even offline) → Round Robin
 */
async function findBestAgent(agents, botId) {
  // Strategy 1: Try to find online and available agents with capacity
  const onlineAvailableAgents = agents.filter(
    (agent) =>
      agent.isOnline &&
      agent.availabilityStatus === 'available' &&
      agent.currentActiveChats < agent.maxConcurrentChats
  );

  if (onlineAvailableAgents.length > 0) {
    // Use least-busy algorithm for online agents
    const leastBusyAgent = onlineAvailableAgents.reduce((prev, current) =>
      prev.currentActiveChats < current.currentActiveChats ? prev : current
    );

    logger.info('Assigned to least busy online agent', {
      agentEmail: leastBusyAgent.email,
      activeChats: leastBusyAgent.currentActiveChats,
      maxChats: leastBusyAgent.maxConcurrentChats,
    });

    return {
      agent: leastBusyAgent,
      method: 'least_busy',
    };
  }

  // Strategy 2: No online agents, use round-robin among all agents
  const roundRobinAgent = getRoundRobinAgent(agents, botId);

  logger.info('Assigned via round-robin (no online agents)', {
    agentEmail: roundRobinAgent.email,
    isOnline: roundRobinAgent.isOnline,
  });

  return {
    agent: roundRobinAgent,
    method: 'round_robin',
  };
}

/**
 * Round-robin assignment
 */
function getRoundRobinAgent(agents, botId) {
  if (!roundRobinCounters.has(botId)) {
    roundRobinCounters.set(botId, 0);
  }

  const counter = roundRobinCounters.get(botId);
  const agent = agents[counter % agents.length];

  // Increment counter for next assignment
  roundRobinCounters.set(botId, (counter + 1) % agents.length);

  return agent;
}

/**
 * Send notifications to agents
 */
async function sendHandoffNotifications(
  handoffSession,
  assignmentResult,
  allAgents
) {
  const { agent, method } = assignmentResult;

  // If agent is online, in-app notification will be handled by real-time system
  if (agent.isOnline) {
    logger.info('Agent is online, in-app notification will be sent', {
      agentId: agent._id,
      agentEmail: agent.email,
    });

    // Mark notification as sent
    await HandoffSession.findByIdAndUpdate(handoffSession._id, {
      $push: {
        notificationsSent: {
          agentId: agent._id,
          sentAt: new Date(),
          channel: 'in_app',
        },
      },
    });
  } else {
    // Agent is offline, send email notification
    await sendEmailNotification(agent, handoffSession);
  }

  // Optional: If assigned agent doesn't respond in 2 minutes, escalate to others
  setTimeout(
    () => {
      checkAndEscalate(handoffSession._id, allAgents);
    },
    2 * 60 * 1000
  ); // 2 minutes
}

/**
 * Send email notification to agent
 */
async function sendEmailNotification(agent, handoffSession) {
  try {
    if (!agent.emailNotifications) {
      logger.info('Email notifications disabled for agent', {
        agentEmail: agent.email,
      });
      return;
    }

    await sendEmail({
      to: agent.email,
      subject: 'New User Request - Human Support Needed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">New Support Request</h2>
          <p>A user has requested human assistance.</p>
          
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Question:</strong></p>
            <p style="margin: 10px 0;">${handoffSession.userQuestion || 'Not specified'}</p>
          </div>

          <p><strong>Requested at:</strong> ${new Date(handoffSession.requestedAt).toLocaleString()}</p>
          <p><strong>Session ID:</strong> ${handoffSession._id}</p>

          <div style="margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}/agent/dashboard/handoff/${handoffSession._id}" 
               style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View and Respond
            </a>
          </div>

          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            This is an automated notification from TasteAI Studio.
          </p>
        </div>
      `,
    });

    // Mark email as sent
    await HandoffSession.findByIdAndUpdate(handoffSession._id, {
      $push: {
        notificationsSent: {
          agentId: agent._id,
          sentAt: new Date(),
          channel: 'email',
        },
      },
    });

    logger.info('Email notification sent', {
      agentEmail: agent.email,
      handoffSessionId: handoffSession._id,
    });
  } catch (error) {
    logger.error('Failed to send email notification', {
      error: error.message,
      agentEmail: agent.email,
      handoffSessionId: handoffSession._id,
    });
  }
}

/**
 * Escalate to other agents if primary doesn't respond
 */
async function checkAndEscalate(handoffSessionId, allAgents) {
  try {
    const session = await HandoffSession.findById(handoffSessionId);

    // If still pending after 2 minutes, notify other agents
    if (session && session.status === 'pending' && !session.escalated) {
      logger.warn('Handoff session still pending, escalating', {
        handoffSessionId,
        assignedAgent: session.assignedAgent,
      });

      // Notify all other agents
      let notifiedCount = 0;
      for (const agent of allAgents) {
        if (agent._id.toString() !== session.assignedAgent.toString()) {
          if (!agent.isOnline && agent.emailNotifications) {
            await sendEmailNotification(agent, session);
            notifiedCount++;
          }
        }
      }

      // Update session to indicate escalation
      await HandoffSession.findByIdAndUpdate(handoffSessionId, {
        escalated: true,
        escalatedAt: new Date(),
      });

      logger.info('Session escalated to other agents', {
        handoffSessionId,
        notifiedCount,
      });
    }
  } catch (error) {
    logger.error('Error in escalation', {
      error: error.message,
      handoffSessionId,
    });
  }
}

/**
 * Agent accepts handoff session
 */
exports.acceptHandoffSession = async (agentId, handoffSessionId) => {
  try {
    const session = await HandoffSession.findById(handoffSessionId);

    if (!session) {
      throw new Error('Handoff session not found');
    }

    if (session.status === 'active') {
      throw new Error('Session already accepted');
    }

    if (session.status === 'resolved') {
      throw new Error('Session already resolved');
    }

    const responseTime = Math.floor(
      (Date.now() - session.requestedAt.getTime()) / 1000
    );

    // Update session
    await HandoffSession.findByIdAndUpdate(handoffSessionId, {
      status: 'active',
      acceptedAt: new Date(),
      assignedAgent: agentId, // In case another agent takes it
      responseTime,
    });

    // Increment active chats for the accepting agent
    await HumanAgent.findByIdAndUpdate(agentId, {
      $inc: { currentActiveChats: 1 },
    });

    // If a different agent accepted, decrement the original agent's count
    if (session.assignedAgent.toString() !== agentId.toString()) {
      await HumanAgent.findByIdAndUpdate(session.assignedAgent, {
        $inc: { currentActiveChats: -1 },
      });
    }

    logger.info('Handoff session accepted', {
      agentId,
      handoffSessionId,
      responseTime,
    });

    return { success: true, responseTime };
  } catch (error) {
    logger.error('Error accepting handoff', {
      error: error.message,
      agentId,
      handoffSessionId,
    });
    throw error;
  }
};

/**
 * Agent resolves handoff session
 */
exports.resolveHandoffSession = async (
  agentId,
  handoffSessionId,
  notes = ''
) => {
  try {
    const session = await HandoffSession.findById(handoffSessionId);

    if (!session) {
      throw new Error('Handoff session not found');
    }

    if (session.status === 'resolved') {
      throw new Error('Session already resolved');
    }

    const resolutionTime = Math.floor(
      (Date.now() - session.requestedAt.getTime()) / 1000
    );
    const responseTime = session.responseTime || resolutionTime;

    // Update session
    await HandoffSession.findByIdAndUpdate(handoffSessionId, {
      status: 'resolved',
      resolvedAt: new Date(),
      agentNotes: notes,
      resolutionTime,
    });

    // Decrement agent's active chat count
    await HumanAgent.findByIdAndUpdate(agentId, {
      $inc: {
        currentActiveChats: -1,
        totalChatsHandled: 1,
      },
    });

    // Update agent metrics
    const agent = await HumanAgent.findById(agentId);
    if (agent) {
      await agent.updateMetrics(responseTime, resolutionTime);
    }

    // Update flow session
    await FlowSession.findByIdAndUpdate(session.flowSession, {
      human_handoff_resolved: true,
      human_handoff_resolved_at: new Date(),
    });

    logger.info('Handoff session resolved', {
      agentId,
      handoffSessionId,
      resolutionTime,
    });

    return { success: true, resolutionTime };
  } catch (error) {
    logger.error('Error resolving handoff', {
      error: error.message,
      agentId,
      handoffSessionId,
    });
    throw error;
  }
};

/**
 * Get handoff sessions for an agent
 */
exports.getHumanAgentHandoffSessions = async (
  agentId,
  filters = {}
) => {
  try {
    const {
      status = 'all',
      includeEscalated = true,
      page = 1,
      limit = 50,
    } = filters;

    // Build the query
    let query = {};

    if (includeEscalated) {
      // Include sessions currently assigned OR previously assigned (escalated away)
      query = {
        $or: [
          { assignedAgent: agentId },
          { 'escalationHistory.previousAgent': agentId },
        ],
      };
    } else {
      // Only currently assigned sessions
      query = { assignedAgent: agentId };
    }

    // Add status filter
    if (status !== 'all') {
      if (status === 'active') {
        query.status = { $in: ['pending', 'active'] };
      } else {
        query.status = status;
      }
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [sessions, totalCount] = await Promise.all([
      HandoffSession.find(query)
        .populate('bot', 'name description')
        .populate('assignedAgent', 'email displayName avatarUrl')
        .populate('escalationHistory.previousAgent', 'email displayName')
        .populate('escalationHistory.newAgent', 'email displayName')
        .populate('flowSession')
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HandoffSession.countDocuments(query),
    ]);

    // Enrich sessions with escalation metadata
    const enrichedSessions = sessions.map((session) => {
      // Check if this agent is the current assignee or was escalated
      const isCurrentAssignee =
        session.assignedAgent._id.toString() === agentId.toString();

      let escalationInfo = null;

      if (!isCurrentAssignee && session.escalationHistory?.length > 0) {
        // Find the escalation record where this agent was the previous agent
        const relevantEscalation = session.escalationHistory.find(
          (esc) => esc.previousAgent._id.toString() === agentId.toString()
        );

        if (relevantEscalation) {
          escalationInfo = {
            wasEscalated: true,
            escalatedFrom: relevantEscalation.previousStatus,
            escalatedTo: relevantEscalation.newAgent.email,
            escalatedAt: relevantEscalation.escalatedAt,
            reason: relevantEscalation.reason,
          };
        }
      }

      return {
        ...session,
        isCurrentAssignee,
        escalationInfo,
      };
    });

    logger.info('Retrieved agent handoff sessions with escalation info', {
      agentId,
      totalCount,
      page,
      limit,
      includeEscalated,
    });

    return {
      sessions: enrichedSessions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: skip + sessions.length < totalCount,
      },
    };
  } catch (error) {
    logger.error('Error fetching agent sessions with escalation', {
      error: error.message,
      stack: error.stack,
      agentId,
      filters,
    });
    throw error;
  }
};

/**
 * Add a message to handoff session
 */
exports.addMessageToSession = async (
  handoffSessionId,
  sender,
  message,
  agentId = null
) => {
  try {
    const session = await HandoffSession.findById(handoffSessionId);

    if (!session) {
      throw new Error('Handoff session not found');
    }

    // Create the message object
    const newMessage = {
      sender,
      message,
      timestamp: new Date(),
    };

    // Add agentId if provided
    if (agentId) {
      newMessage.agentId = agentId;
    }

    // Push message to the messages array
    session.messages.push(newMessage);

    // Update lastAgentResponseAt if sender is agent
    if (sender === 'agent') {
      session.lastAgentResponseAt = new Date();
    }

    // Save the session
    await session.save();

    // Also save to FlowSession history if flowSession is linked
    if (session.flowSession) {
      try {
        const flowSession = await FlowSession.findById(session.flowSession);
        if (flowSession) {
          flowSession.history.push({
            mode: 'handoff',
            messageText: message,
            sender: sender,
            agentId: agentId || null,
            handoffSessionId: handoffSessionId,
            timestamp: new Date(),
            fromUser: sender === 'user',
          });

          // Update current mode to handoff
          flowSession.currentMode = 'handoff';
          flowSession.activeHandoffSessionId = handoffSessionId;

          await flowSession.save();
          logger.debug('Message saved to FlowSession history', {
            flowSessionId: session.flowSession,
            handoffSessionId,
            sender,
          });
        }
      } catch (error) {
        logger.error('Error saving message to FlowSession', {
          error: error.message,
          flowSessionId: session.flowSession,
          handoffSessionId,
        });
        // Don't throw error, continue with handoff message save
      }
    }

    logger.debug('Message added to handoff session', {
      handoffSessionId,
      sender,
      messageCount: session.messages.length,
    });

    return {
      success: true,
      message: newMessage,
      session: session,
    };
  } catch (error) {
    logger.error('Error adding message', {
      error: error.message,
      stack: error.stack,
      handoffSessionId,
    });
    throw error;
  }
};
