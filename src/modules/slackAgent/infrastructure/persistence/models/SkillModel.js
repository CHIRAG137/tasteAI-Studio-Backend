'use strict';

const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
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

    type: {
      type: String,
      required: true,
      index: true,
    },

    version: {
      type: String,
      default: '1.0.0',
    },

    isEnabled: {
      type: Boolean,
      default: true,
    },

    configuration: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    permissions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    entryPoint: String,

    dependencies: [String],

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

skillSchema.index({ organizationId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Skill', skillSchema);
