'use strict';

const mongoose = require('mongoose');

const customizationSchema = new mongoose.Schema(
  {
    botId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
      unique: true,
    },

    headerTitle: {
      type: String,
      default: 'Chat Assistant',
    },

    headerSubtitle: {
      type: String,
      default: 'Online',
    },

    primaryColor: {
      type: String,
      default: '#3b82f6',
    },

    backgroundColor: {
      type: String,
      default: '#ffffff',
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Customization', customizationSchema);
