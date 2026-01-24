const mongoose = require('mongoose');

const HumanAgentSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    passwordHash: {
      type: String,
      default: null,
    },

    isPasswordSet: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastLoginAt: Date,
  },
  { timestamps: true }
);

HumanAgentSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('HumanAgent', HumanAgentSchema);
