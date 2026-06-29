'use strict';

const mongoose = require('mongoose');

const slackChannelSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SlackWorkspace',
      required: true,
      index: true,
    },

    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    channelId: {
      type: String,
      required: true,
    },

    channelName: {
      type: String,
      required: true,
    },

    channelTopic: String,

    channelPurpose: String,

    isMember: {
      type: Boolean,
      default: false,
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },

    isMonitored: {
      type: Boolean,
      default: false,
    },

    memberCount: {
      type: Number,
      default: 0,
    },

    permissions: [String],

    configuration: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    lastSyncedAt: Date,
  },
  {
    timestamps: true,
  },
);

slackChannelSchema.index({ workspaceId: 1, channelId: 1 }, { unique: true });
slackChannelSchema.index({ organizationId: 1, isMonitored: 1 });
slackChannelSchema.index({ channelName: 'text' });

module.exports = mongoose.model('SlackChannel', slackChannelSchema);
