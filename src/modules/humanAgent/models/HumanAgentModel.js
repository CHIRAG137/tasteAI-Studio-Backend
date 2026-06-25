'use strict';

const mongoose = require('mongoose');

const daySchema = {
  start: {
    type: String,
    default: '09:00',
  },

  end: {
    type: String,
    default: '18:00',
  },

  enabled: {
    type: Boolean,
    default: true,
  },
};

const HumanAgentSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },

    displayName: String,

    avatarUrl: String,

    phoneNumber: String,

    auth0Id: {
      type: String,
      sparse: true,
      unique: true,
    },

    passwordHash: {
      type: String,
      default: null,
    },

    isPasswordSet: {
      type: Boolean,
      default: false,
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'away', 'offline'],
      default: 'offline',
    },

    currentActiveChats: {
      type: Number,
      default: 0,
    },

    maxConcurrentChats: {
      type: Number,
      default: 5,
    },

    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('HumanAgent', HumanAgentSchema);
