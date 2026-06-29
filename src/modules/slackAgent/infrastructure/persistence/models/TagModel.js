'use strict';

const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema(
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

    color: String,

    description: String,

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

tagSchema.index({ organizationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Tag', tagSchema);
