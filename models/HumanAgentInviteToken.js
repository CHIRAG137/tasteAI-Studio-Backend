const mongoose = require('mongoose');

const HumanAgentInviteTokenSchema = new mongoose.Schema(
  {
    // human Agent who has been enabled as agent for the bot to handle user queries
    humanAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HumanAgent',
      required: true,
    },

    // human agent invite token that gets expired after some time if invite not accepted
    token: {
      type: String,
      required: true,
      index: true,
    },

    // timestamp of when the token gets expired
    expiresAt: {
      type: Date,
      required: true,
    },

    // flag to check if the token has been used or not
    used: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HumanAgentInviteToken', HumanAgentInviteTokenSchema);
