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

// Virtual for total messages
HandoffSessionSchema.virtual('messageCount').get(function () {
  return this.messages.length;
});

// Method to add a message
HandoffSessionSchema.methods.addMessage = async function (sender, message, agentId = null) {
  this.messages.push({
    sender,
    message,
    timestamp: new Date(),
    agentId,
  });
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
  return this.find({ assignedAgent: agentId, status: { $in: ['pending', 'active'] } })
    .populate('bot', 'name')
    .populate('flowSession')
    .sort({ requestedAt: -1 });
};

module.exports = mongoose.model('HandoffSession', HandoffSessionSchema);
