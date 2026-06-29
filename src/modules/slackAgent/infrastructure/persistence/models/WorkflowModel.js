'use strict';

const mongoose = require('mongoose');

const workflowStepSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },

    name: String,

    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    conditions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    onSuccess: String,

    onFailure: String,

    timeout: Number,

    retryCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const workflowExecutionSchema = new mongoose.Schema(
  {
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
    },

    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'paused', 'cancelled'],
      default: 'pending',
    },

    triggeredBy: String,

    input: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    output: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    error: String,

    startedAt: Date,

    completedAt: Date,

    logs: [
      {
        step: String,
        status: String,
        message: String,
        duration: Number,
        timestamp: Date,
      },
    ],
  },
  {
    timestamps: true,
  },
);

const workflowSchema = new mongoose.Schema(
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

    trigger: {
      type: String,
      required: true,
    },

    conditions: [
      {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    ],

    steps: [workflowStepSchema],

    variables: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    timeout: Number,

    maxRetries: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isTemplate: {
      type: Boolean,
      default: false,
    },

    templateId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    version: {
      type: Number,
      default: 1,
    },

    createdById: {
      type: mongoose.Schema.Types.ObjectId,
    },

    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
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

workflowSchema.index({ organizationId: 1, isActive: 1 });
workflowSchema.index({ trigger: 1 });

module.exports = mongoose.model('Workflow', workflowSchema);
module.exports.WorkflowExecution = mongoose.model('WorkflowExecution', workflowExecutionSchema);
