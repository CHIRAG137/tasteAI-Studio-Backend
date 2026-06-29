'use strict';

const mongoose = require('mongoose');

const escalationLevelSchema = new mongoose.Schema(
  {
    level: {
      type: Number,
      required: true,
    },

    name: String,

    assignedToId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    assignedToType: {
      type: String,
      enum: ['user', 'team', 'department', 'manager'],
      default: 'user',
    },

    notifyIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],

    timeoutMinutes: Number,

    actions: [String],
  },
  { _id: false },
);

const escalationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    description: String,

    trigger: {
      type: String,
      required: true,
    },

    conditions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    levels: [escalationLevelSchema],

    notifyOnEscalate: {
      type: Boolean,
      default: false,
    },

    notificationConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    autoResolve: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Escalation', escalationSchema);
