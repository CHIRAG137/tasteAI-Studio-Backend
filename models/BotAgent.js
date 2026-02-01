const mongoose = require('mongoose');

const BotAgentSchema = new mongoose.Schema(
  {
    // chatbot
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
    },

    // human agent
    humanAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HumanAgent',
      required: true,
    },

    // flag to check if the chatbot is enabled for the agent(for eg. if the agent for a chatbot gets removed then isEnabled == "false")
    isEnabled: {
      type: Boolean,
      default: true,
    },

    // role of the human agent
    role: {
      type: String,
      enum: ['agent', 'admin'],
      default: 'agent',
    },
  },
  { timestamps: true }
);

BotAgentSchema.index({ bot: 1, agent: 1 }, { unique: true });

module.exports = mongoose.model('BotAgent', BotAgentSchema);
