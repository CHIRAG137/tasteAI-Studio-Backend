'use strict';

const mongoose = require('mongoose');

const mcpToolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    description: String,

    inputSchema: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const mcpConnectionSchema = new mongoose.Schema(
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

    serverUrl: {
      type: String,
      required: true,
    },

    serverType: {
      type: String,
      enum: ['stdio', 'sse', 'http'],
      default: 'http',
    },

    apiKey: String,

    authentication: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    tools: [mcpToolSchema],

    isConnected: {
      type: Boolean,
      default: false,
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    healthStatus: {
      type: String,
      enum: ['unknown', 'healthy', 'degraded', 'unhealthy'],
      default: 'unknown',
    },

    lastHealthCheckAt: Date,

    configuration: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

module.exports = mongoose.model('MCPConnection', mcpConnectionSchema);
