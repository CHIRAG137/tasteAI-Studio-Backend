const HumanAgent = require('../models/HumanAgent');
const BotAgent = require('../models/BotAgent');
const HandoffSession = require('../models/HandoffSession');
const logger = require('../utils/logger');

// handle agent removal from a bot - escalate their active/pending handoffs
exports.handleHumanAgentRemovalEscalation = async (botId, removedAgentIds) => {
  try {
    logger.info('Starting agent removal escalation', {
      botId,
      removedAgentIds,
    });

    for (const agentId of removedAgentIds) {
      // Find all pending or active handoff sessions for this agent on this bot
      const sessionsToEscalate = await HandoffSession.find({
        bot: botId,
        assignedAgent: agentId,
        status: { $in: ['pending', 'active'] },
      }).populate('assignedAgent', 'email');

      if (sessionsToEscalate.length === 0) {
        logger.info('No sessions to escalate for removed agent', {
          botId,
          agentId,
        });
        continue;
      }

      logger.info('Found sessions to escalate', {
        botId,
        agentId,
        count: sessionsToEscalate.length,
      });

      // Get eligible agents for reassignment (excluding the removed agent)
      const eligibleAgents = await getEligibleHumanAgentsForReassignment(
        botId,
        agentId
      );

      if (eligibleAgents.length === 0) {
        logger.error('No eligible agents for reassignment', { botId, agentId });
        // Mark sessions as abandoned since no agents available
        await HandoffSession.updateMany(
          {
            bot: botId,
            assignedAgent: agentId,
            status: { $in: ['pending', 'active'] },
          },
          {
            status: 'abandoned',
            escalated: true,
            escalatedAt: new Date(),
            agentNotes:
              'Agent removed from bot - no agents available for reassignment',
          }
        );
        continue;
      }

      // Escalate each session
      for (const session of sessionsToEscalate) {
        await escalateHandoffSession(session, eligibleAgents, botId);
      }

      // Decrement the removed agent's active chat count
      const activeSessionsCount = sessionsToEscalate.filter(
        (s) => s.status === 'active'
      ).length;

      if (activeSessionsCount > 0) {
        await HumanAgent.findByIdAndUpdate(agentId, {
          $inc: {
            currentActiveChats: -activeSessionsCount,
          },
        });
      }
    }

    logger.info('Agent removal escalation completed', {
      botId,
      removedAgentIds,
    });

    return { success: true };
  } catch (error) {
    logger.error('Error in handleAgentRemovalEscalation', {
      error: error.message,
      stack: error.stack,
      botId,
      removedAgentIds,
    });
    throw error;
  }
};

// get eligible agents for reassignment (excluding the removed agent)
async function getEligibleHumanAgentsForReassignment(botId, removedAgentId) {
  const botAgents = await BotAgent.find({
    bot: botId,
    isEnabled: true,
  }).populate({
    path: 'humanAgent',
    match: {
      isActive: true,
      isPasswordSet: true,
      _id: { $ne: removedAgentId },
    },
  });

  // Filter out null humanAgent entries
  const eligibleAgents = botAgents
    .filter((ba) => ba.humanAgent !== null)
    .map((ba) => ba.humanAgent);

  logger.debug('Eligible agents for reassignment', {
    botId,
    removedAgentId,
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

// escalate a single session to a new agent
async function escalateHandoffSession(session, eligibleAgents, botId) {
  try {
    const previousStatus = session.status;
    const previousAgent = session.assignedAgent;

    // Find best agent using the same logic as requestHumanHandoff
    const assignmentResult = await findBestHumanAgentForEscalation(
      eligibleAgents,
      botId
    );

    // Update the session with escalation metadata
    await HandoffSession.findByIdAndUpdate(session._id, {
      assignedAgent: assignmentResult.agent._id,
      escalated: true,
      escalatedAt: new Date(),
      assignmentMethod: assignmentResult.method,
      // Add escalation metadata to track the history
      $push: {
        escalationHistory: {
          previousAgent: previousAgent._id,
          previousStatus: previousStatus,
          newAgent: assignmentResult.agent._id,
          escalatedAt: new Date(),
          reason: 'agent_removed_from_bot',
        },
      },
      agentNotes: session.agentNotes
        ? `${session.agentNotes}\n\n[ESCALATED: Agent removed from bot - reassigned to ${assignmentResult.agent.email}]`
        : `[ESCALATED: Agent removed from bot - reassigned to ${assignmentResult.agent.email}]`,
    });

    // Increment new agent's chat count if session was active
    if (previousStatus === 'active') {
      await HumanAgent.findByIdAndUpdate(assignmentResult.agent._id, {
        $inc: { currentActiveChats: 1, totalChatsAssigned: 1 },
      });
    } else {
      await HumanAgent.findByIdAndUpdate(assignmentResult.agent._id, {
        $inc: { totalChatsAssigned: 1 },
      });
    }

    logger.info('Session escalated successfully', {
      sessionId: session._id,
      previousAgent: previousAgent.email,
      previousStatus,
      newAgent: assignmentResult.agent.email,
      method: assignmentResult.method,
    });

    return {
      success: true,
      newAgent: assignmentResult.agent,
      previousStatus,
    };
  } catch (error) {
    logger.error('Error escalating session', {
      error: error.message,
      sessionId: session._id,
    });
    throw error;
  }
}

// find best agent for escalation (same logic as requestHumanHandoff)
async function findBestHumanAgentForEscalation(agents, botId) {
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

    logger.info('Assigned to least busy online agent for escalation', {
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
  const roundRobinAgent = getRoundRobinHumanAgentForEscalation(agents, botId);

  logger.info('Assigned via round-robin for escalation (no online agents)', {
    agentEmail: roundRobinAgent.email,
    isOnline: roundRobinAgent.isOnline,
  });

  return {
    agent: roundRobinAgent,
    method: 'round_robin',
  };
}

// round-robin assignment for escalation
function getRoundRobinHumanAgentForEscalation(agents, botId) {
  // Use timestamp-based selection for simplicity
  const index = Math.floor(Date.now() / 1000) % agents.length;
  return agents[index];
}
