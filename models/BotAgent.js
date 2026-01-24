const mongoose = require('mongoose');

const BotAgentSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
    },

    humanAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HumanAgent',
      required: true,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

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
