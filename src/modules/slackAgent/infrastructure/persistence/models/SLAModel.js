'use strict';

const mongoose = require('mongoose');

const slaSchema = new mongoose.Schema(
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

    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
    },

    responseTimeMinutes: {
      type: Number,
      required: true,
    },

    resolutionTimeMinutes: {
      type: Number,
      required: true,
    },

    businessHoursOnly: {
      type: Boolean,
      default: false,
    },

    businessHoursId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    escalateAfterBreach: {
      type: Boolean,
      default: false,
    },

    escalationRuleId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    notifyOnBreach: {
      type: Boolean,
      default: false,
    },

    notificationConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    reminderConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    conditions: {
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

const slaTimerSchema = new mongoose.Schema(
  {
    slaPolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SLA',
      required: true,
    },

    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    },

    responseDeadline: {
      type: Date,
      required: true,
    },

    resolutionDeadline: {
      type: Date,
      required: true,
    },

    responseReminderSent: {
      type: Boolean,
      default: false,
    },

    resolutionReminderSent: {
      type: Boolean,
      default: false,
    },

    responseBreached: {
      type: Boolean,
      default: false,
    },

    resolutionBreached: {
      type: Boolean,
      default: false,
    },

    pausedAt: Date,

    pausedDuration: {
      type: Number,
      default: 0,
    },

    businessHoursId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    startedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

slaSchema.index({ organizationId: 1, priority: 1 });
slaTimerSchema.index({ ticketId: 1 });
slaTimerSchema.index({ responseDeadline: 1, responseBreached: 1 });
slaTimerSchema.index({ resolutionDeadline: 1, resolutionBreached: 1 });

module.exports = mongoose.model('SLA', slaSchema);
module.exports.SLATimer = mongoose.model('SLATimer', slaTimerSchema);
