'use strict';

const mongoose = require('mongoose');

const routingRuleSchema = new mongoose.Schema(
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
      type: Number,
      default: 0,
    },

    conditions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    targetType: {
      type: String,
      enum: ['user', 'team', 'department', 'agent', 'skill'],
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    fallbackRuleId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    loadBalancingStrategy: {
      type: String,
      enum: ['round_robin', 'least_busy', 'random', 'skill_match', 'capacity'],
    },

    order: {
      type: Number,
      default: 0,
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

routingRuleSchema.index({ organizationId: 1, order: 1 });

module.exports = mongoose.model('RoutingRule', routingRuleSchema);
