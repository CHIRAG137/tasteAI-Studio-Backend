'use strict';

const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SlackWorkspace',
      index: true,
    },

    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SlackChannel',
    },

    teamId: String,

    eventId: {
      type: String,
      required: true,
      unique: true,
    },

    eventType: {
      type: String,
      required: true,
      index: true,
    },

    eventTs: String,

    source: String,

    rawBody: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    processedBy: [String],

    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
      default: 'pending',
      index: true,
    },

    error: String,

    retryCount: {
      type: Number,
      default: 0,
    },

    processedAt: Date,
  },
  {
    timestamps: true,
  },
);

eventSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('SlackEvent', eventSchema);
