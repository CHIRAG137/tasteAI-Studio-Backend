'use strict';

const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
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

    avatarUrl: String,

    isActive: {
      type: Boolean,
      default: true,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    assignedChannelIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SlackChannel',
      },
    ],

    skills: [String],

    aiInstructions: [
      {
        type: {
          type: String,
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        priority: {
          type: String,
          enum: ['low', 'normal', 'high'],
          default: 'normal',
        },
        scope: {
          type: String,
          default: 'global',
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    configuration: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    llmConfig: {
      provider: String,
      model: String,
      temperature: Number,
      maxTokens: Number,
      apiKeySource: String,
    },

    promptConfig: {
      systemPrompt: String,
      welcomeMessage: String,
      fallbackMessage: String,
    },

    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    mcpServerIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MCPConnection',
      },
    ],

    webhookIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Webhook',
      },
    ],

    slackAiCapabilities: {
      enabled: { type: Boolean, default: false },
      channelSummary: { type: Boolean, default: false },
      threadSummary: { type: Boolean, default: false },
      messageSuggestion: { type: Boolean, default: false },
      smartReply: { type: Boolean, default: false },
      autoTagging: { type: Boolean, default: false },
      sentimentAnalysis: { type: Boolean, default: false },
      knowledgeRetrieval: { type: Boolean, default: false },
      customInstructions: [String],
      enableSlashCommands: { type: Boolean, default: true },
      postTagsAsEphemeral: { type: Boolean, default: true },
      channelSummaryConfig: {
        triggerMode: {
          type: String,
          enum: ['manual', 'cron', 'both'],
          default: 'manual',
        },
        cronExpression: { type: String, default: '0 9 * * 1-5' },
        timeRangeHours: { type: Number, default: 24 },
        autoPostToChannel: { type: Boolean, default: true },
        targetChannelId: { type: String, default: null },
      },
    },

    connectorConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    invocationConfig: {
      appMention: {
        enabled: { type: Boolean, default: true },
        responseInThread: { type: Boolean, default: true },
      },
      directMessage: {
        enabled: { type: Boolean, default: true },
        autoRespond: { type: Boolean, default: true },
      },
      slashCommands: [
        {
          command: { type: String },
          description: { type: String },
          usageHint: { type: String },
          enabled: { type: Boolean, default: true },
        },
      ],
      channelMonitoring: {
        enabled: { type: Boolean, default: true },
        respondInThread: { type: Boolean, default: false },
      },
      keywordTriggers: [
        {
          keyword: { type: String },
          matchType: { type: String, enum: ['exact', 'contains', 'regex'], default: 'contains' },
          response: { type: String },
          enabled: { type: Boolean, default: true },
        },
      ],
      webhookEvents: {
        messageReceived: { type: Boolean, default: true },
        messageChanged: { type: Boolean, default: false },
        reactionAdded: { type: Boolean, default: false },
        fileShared: { type: Boolean, default: false },
        memberJoined: { type: Boolean, default: false },
      },
      routing: {
        mode: {
          type: String,
          enum: ['all', 'ai_filter', 'keyword_only', 'disabled'],
          default: 'all',
        },
        aiFilterInstructions: { type: String },
      },
    },

    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

agentSchema.index({ organizationId: 1, isEnabled: 1 });
agentSchema.index({ name: 'text' });

module.exports = mongoose.model('Agent', agentSchema);
