'use strict';

const mongoose = require('mongoose');

const classificationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      index: true,
    },

    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Thread',
    },

    messageTs: String,

    intent: String,

    category: String,

    subCategory: String,

    priority: String,

    sentiment: String,

    urgency: String,

    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    isDuplicate: {
      type: Boolean,
      default: false,
    },

    duplicateOfId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    suggestedAssignee: {
      type: mongoose.Schema.Types.ObjectId,
    },

    suggestedResponse: String,

    modelUsed: String,

    processedAt: {
      type: Date,
      default: Date.now,
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

module.exports = mongoose.model('Classification', classificationSchema);
