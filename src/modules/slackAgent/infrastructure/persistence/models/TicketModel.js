'use strict';

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    authorType: {
      type: String,
      enum: ['user', 'agent', 'system', 'slack_user'],
      default: 'user',
    },

    body: {
      type: String,
      required: true,
    },

    isInternal: {
      type: Boolean,
      default: false,
    },

    attachments: [String],

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

const attachmentSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },

    fileType: String,

    fileUrl: {
      type: String,
      required: true,
    },

    fileSize: Number,

    uploadedById: {
      type: mongoose.Schema.Types.ObjectId,
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

const timelineEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    actorType: String,

    description: String,

    changes: {
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

const ticketSchema = new mongoose.Schema(
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
      index: true,
    },

    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SlackChannel',
      index: true,
    },

    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Thread',
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: String,

    status: {
      type: String,
      enum: [
        'open',
        'in_progress',
        'waiting_on_customer',
        'waiting_on_third_party',
        'resolved',
        'closed',
        'reopened',
        'merged',
        'spam',
        'archived',
      ],
      default: 'open',
      index: true,
    },

    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },

    category: {
      type: String,
      index: true,
    },

    assignedToId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    assignedTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },

    createdById: {
      type: mongoose.Schema.Types.ObjectId,
    },

    createdByType: {
      type: String,
      enum: ['user', 'agent', 'slack_user', 'system', 'ai'],
      default: 'user',
    },

    source: {
      type: String,
      enum: ['slack', 'api', 'email', 'web', 'portal', 'ai'],
      default: 'slack',
    },

    tags: [String],

    labels: [String],

    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    slaPolicyId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    slaDueAt: Date,

    firstResponseAt: Date,

    resolvedAt: Date,

    closedAt: Date,

    reopenedAt: Date,

    mergedIntoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
    },

    mergedTicketIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket',
      },
    ],

    splitFromId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
    },

    escalationLevel: {
      type: Number,
      default: 0,
    },

    isEscalated: {
      type: Boolean,
      default: false,
    },

    satisfactionScore: Number,

    comments: [commentSchema],

    attachments: [attachmentSchema],

    timeline: [timelineEntrySchema],

    watcherIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],

    followerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

ticketSchema.index({ organizationId: 1, status: 1 });
ticketSchema.index({ organizationId: 1, priority: 1 });
ticketSchema.index({ organizationId: 1, assignedToId: 1, status: 1 });
ticketSchema.index({ title: 'text', description: 'text' });
ticketSchema.index({ tags: 1 });
ticketSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
