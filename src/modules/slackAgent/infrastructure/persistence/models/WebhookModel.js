'use strict';

const mongoose = require('mongoose');

const deadLetterEntrySchema = new mongoose.Schema(
  {
    eventId: String,

    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    error: String,

    failedAt: {
      type: Date,
      default: Date.now,
    },

    retryCount: Number,
  },
  { _id: false },
);

const webhookSchema = new mongoose.Schema(
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

    type: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
    },

    url: {
      type: String,
      required: true,
    },

    secret: String,

    events: [String],

    headers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    retryConfig: {
      maxRetries: {
        type: Number,
        default: 3,
      },
      backoffMs: {
        type: Number,
        default: 1000,
      },
      backoffMultiplier: {
        type: Number,
        default: 2,
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastTriggeredAt: Date,

    lastResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    deadLetterQueue: [deadLetterEntrySchema],

    failureCount: {
      type: Number,
      default: 0,
    },

    successCount: {
      type: Number,
      default: 0,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    createdById: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
  },
);

webhookSchema.index({ organizationId: 1, type: 1 });

module.exports = mongoose.model('Webhook', webhookSchema);
