const mongoose = require('mongoose');

const HumanAgentInviteTokenSchema = new mongoose.Schema(
  {
    humanAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HumanAgent',
      required: true,
    },

    token: {
      type: String,
      required: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HumanAgentInviteToken', HumanAgentInviteTokenSchema);
