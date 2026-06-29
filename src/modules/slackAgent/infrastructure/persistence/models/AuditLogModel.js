'use strict';

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    actorType: {
      type: String,
      enum: ['user', 'agent', 'system', 'ai', 'webhook'],
      required: true,
    },

    action: {
      type: String,
      required: true,
      index: true,
    },

    resourceType: {
      type: String,
      required: true,
      index: true,
    },

    resourceId: {
      type: String,
      required: true,
    },

    targetId: String,

    targetType: String,

    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ipAddress: String,

    userAgent: String,

    sessionId: String,

    correlationId: String,

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
