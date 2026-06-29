'use strict';

const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
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

    date: {
      type: Date,
      required: true,
    },

    recurrence: {
      type: String,
      enum: ['none', 'yearly'],
      default: 'none',
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

holidaySchema.index({ organizationId: 1, date: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
