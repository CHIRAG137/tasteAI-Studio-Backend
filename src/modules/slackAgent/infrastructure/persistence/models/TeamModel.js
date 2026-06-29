'use strict';

const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
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

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },

    leadUserId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    memberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],

    skills: [String],

    isActive: {
      type: Boolean,
      default: true,
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

teamSchema.index({ organizationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
