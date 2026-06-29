'use strict';

const mongoose = require('mongoose');

const slackWorkspaceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    teamId: {
      type: String,
      required: true,
      unique: true,
    },

    teamName: {
      type: String,
      required: true,
    },

    teamDomain: String,

    accessToken: {
      type: String,
      required: true,
    },

    botUserId: String,

    botAccessToken: String,

    scopes: [String],

    authedUserId: String,

    installedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    installedAt: {
      type: Date,
      default: Date.now,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

slackWorkspaceSchema.index({ organizationId: 1, isActive: 1 });
slackWorkspaceSchema.index({ teamId: 1 });

module.exports = mongoose.model('SlackWorkspace', slackWorkspaceSchema);
