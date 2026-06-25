'use strict';

const mongoose = require('mongoose');

const slackIntegrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    slackAccessToken: {
      type: String,
      required: true,
    },

    slackTeamId: String,

    slackTeamName: String,

    slackAuthedUserId: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('SlackIntegration', slackIntegrationSchema);
