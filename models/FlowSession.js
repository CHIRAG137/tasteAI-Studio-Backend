const mongoose = require('mongoose');

const FlowSessionSchema = new mongoose.Schema({
  bot: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatBot', required: true },
  currentNodeId: { type: String, default: null },
  variables: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Enhanced history to store all types of conversations (flow, QA, handoff)
  // Each entry tracks the mode it came from
  history: [
    {
      type: mongoose.Schema.Types.Mixed,
      // Can contain:
      // Flow mode: { nodeId, type, content, timestamp, fromUser, awaitingInput }
      // QA mode: { mode: 'qa', question, answer, timestamp, fromUser }
      // Handoff: { mode: 'handoff', messageText, agentId, timestamp, fromUser }
      default: {},
    },
  ],
  // Track the current mode of the session (flow, qa, handoff, etc)
  currentMode: {
    type: String,
    enum: ['flow', 'qa', 'handoff', 'idle'],
    default: 'idle',
  },
  // Track active handoff session if any
  activeHandoffSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HandoffSession',
    default: null,
  },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },

  // Visitor identity (Auth0) when bot.require_visitor_auth0_identity is enabled
  visitorAuth0Sub: { type: String, default: null },
  visitorEmail: { type: String, default: null },
  isFinished: { type: Boolean, default: false },

  // Store conversation summary to avoid regenerating it
  summary: { type: String, default: null },
  summaryGeneratedAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
  lastUpdatedAt: { type: Date, default: Date.now },
});

FlowSessionSchema.pre('save', function (next) {
  this.lastUpdatedAt = new Date();
  next();
});

module.exports = mongoose.model('FlowSession', FlowSessionSchema);
