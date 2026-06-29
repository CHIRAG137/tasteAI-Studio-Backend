'use strict';

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
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

    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },

    subCategories: [String],

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

categorySchema.index({ organizationId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
