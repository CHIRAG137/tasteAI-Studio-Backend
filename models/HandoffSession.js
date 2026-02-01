const mongoose = require('mongoose');

const HandoffSessionSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      index: true,
    },

    flowSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FlowSession',
      required: true,
      index: true,
    },

    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HumanAgent',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'active', 'resolved', 'abandoned', 'transferred'],
      default: 'pending',
      index: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    acceptedAt: Date,
    resolvedAt: Date,

    userQuestion: {
      type: String,
      default: '',
    },

    agentNotes: String,

    // Assignment metadata
    assignmentMethod: {
      type: String,
      enum: ['round_robin', 'least_busy', 'manual', 'fallback'],
      required: true,
    },

    // User info from session
    userIpAddress: String,
    userAgent: String,

    // Escalation tracking
    escalated: {
      type: Boolean,
      default: false,
    },

    escalatedAt: Date,

    // Escalation history - tracks all escalations for this session
    escalationHistory: [
      {
        previousAgent: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'HumanAgent',
        },
        previousStatus: {
          type: String,
          enum: ['pending', 'active', 'resolved', 'abandoned', 'transferred'],
        },
        newAgent: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'HumanAgent',
        },
        escalatedAt: {
          type: Date,
          default: Date.now,
        },
        reason: {
          type: String,
          enum: [
            'agent_removed_from_bot',
            'no_response',
            'manual_transfer',
            'agent_offline',
          ],
          default: 'no_response',
        },
      },
    ],

    // Notification tracking
    notificationsSent: [
      {
        agentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'HumanAgent',
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
        channel: {
          type: String,
          enum: ['email', 'in_app', 'slack', 'sms'],
        },
      },
    ],

    // Performance metrics
    responseTime: Number, // Time to first agent response (seconds)
    resolutionTime: Number, // Total time to resolution (seconds)

    // Last agent response timestamp
    lastAgentResponseAt: Date,

    // Rating (optional - for future use)
    userRating: {
      type: Number,
      min: 1,
      max: 5,
    },

    userFeedback: String,

    // Messages in this handoff session
    messages: [
      {
        sender: {
          type: String,
          enum: ['user', 'agent'],
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        agentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'HumanAgent',
        },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for better query performance
HandoffSessionSchema.index({ bot: 1, status: 1 });
HandoffSessionSchema.index({ assignedAgent: 1, status: 1 });
HandoffSessionSchema.index({ requestedAt: -1 });
HandoffSessionSchema.index({ status: 1, requestedAt: -1 });
// Index for escalation queries
HandoffSessionSchema.index({ 'escalationHistory.previousAgent': 1 });

// Virtual for total messages
HandoffSessionSchema.virtual('messageCount').get(function () {
  return this.messages.length;
});

// Virtual to check if session was escalated
HandoffSessionSchema.virtual('wasEscalated').get(function () {
  return this.escalated && this.escalationHistory.length > 0;
});

// Method to add a message
HandoffSessionSchema.methods.addMessage = async function (
  sender,
  message,
  agentId = null
) {
  this.messages.push({
    sender,
    message,
    timestamp: new Date(),
    agentId,
  });
  
  // Update lastAgentResponseAt if sender is agent
  if (sender === 'agent') {
    this.lastAgentResponseAt = new Date();
  }
  
  await this.save();
};

// Static method to find pending sessions for a bot
HandoffSessionSchema.statics.findPendingForBot = function (botId) {
  return this.find({ bot: botId, status: 'pending' })
    .populate('assignedAgent', 'email isOnline availabilityStatus')
    .sort({ requestedAt: 1 });
};

// Static method to find active sessions for an agent
HandoffSessionSchema.statics.findActiveForAgent = function (agentId) {
  return this.find({
    assignedAgent: agentId,
    status: { $in: ['pending', 'active'] },
  })
    .populate('bot', 'name')
    .populate('flowSession')
    .sort({ requestedAt: -1 });
};

// Static method to find all sessions for an agent (including escalated ones)
HandoffSessionSchema.statics.findAllSessionsForAgent = function (
  agentId,
  includeEscalated = true
) {
  const query = includeEscalated
    ? {
        $or: [
          { assignedAgent: agentId },
          { 'escalationHistory.previousAgent': agentId },
        ],
      }
    : { assignedAgent: agentId };

  return this.find(query)
    .populate('bot', 'name')
    .populate('assignedAgent', 'email displayName')
    .populate('escalationHistory.previousAgent', 'email displayName')
    .populate('escalationHistory.newAgent', 'email displayName')
    .sort({ requestedAt: -1 });
};

module.exports = mongoose.model('HandoffSession', HandoffSessionSchema);
