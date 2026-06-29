'use strict';

const mongoose = require('mongoose');

const slackUserSchema = new mongoose.Schema(
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

    slackUserId: {
      type: String,
      required: true,
    },

    slackTeamId: String,

    name: {
      type: String,
      required: true,
    },

    realName: String,

    displayName: String,

    email: String,

    avatarUrl: String,

    isBot: {
      type: Boolean,
      default: false,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    isOwner: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    timezone: String,

    title: String,

    phone: String,

    userGroups: [String],

    teams: [String],

    role: String,

    lastSyncedAt: Date,
  },
  {
    timestamps: true,
  },
);

slackUserSchema.index({ workspaceId: 1, slackUserId: 1 }, { unique: true });
slackUserSchema.index({ organizationId: 1 });
slackUserSchema.index({ email: 1 });

module.exports = mongoose.model('SlackUser', slackUserSchema);
