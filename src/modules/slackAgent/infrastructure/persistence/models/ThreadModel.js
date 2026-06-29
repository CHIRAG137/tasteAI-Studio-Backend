'use strict';

const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SlackWorkspace',
      required: true,
      index: true,
    },

    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SlackChannel',
      required: true,
      index: true,
    },

    threadTs: {
      type: String,
      required: true,
    },

    parentMessageTs: String,

    topic: String,

    participants: [String],

    messageCount: {
      type: Number,
      default: 0,
    },

    linkedTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
    },

    isMonitored: {
      type: Boolean,
      default: false,
    },

    aiSummary: String,

    lastActivityAt: Date,

    lastSyncedAt: Date,
  },
  {
    timestamps: true,
  },
);

threadSchema.index({ workspaceId: 1, channelId: 1, threadTs: 1 }, { unique: true });
threadSchema.index({ organizationId: 1, isMonitored: 1 });
threadSchema.index({ linkedTicketId: 1 });

module.exports = mongoose.model('Thread', threadSchema);
