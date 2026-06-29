'use strict';

const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
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

    headUserId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    parentDepartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },

    memberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],

    teamIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],

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

departmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
