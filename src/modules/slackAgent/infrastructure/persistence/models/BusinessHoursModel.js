'use strict';

const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      required: true,
    },

    end: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const businessHoursSchema = new mongoose.Schema(
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

    timezone: {
      type: String,
      default: 'UTC',
    },

    monday: [timeSlotSchema],

    tuesday: [timeSlotSchema],

    wednesday: [timeSlotSchema],

    thursday: [timeSlotSchema],

    friday: [timeSlotSchema],

    saturday: [timeSlotSchema],

    sunday: [timeSlotSchema],

    holidays: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Holiday',
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('BusinessHours', businessHoursSchema);
