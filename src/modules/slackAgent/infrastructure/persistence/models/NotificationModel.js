'use strict';

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },

    channelType: {
      type: String,
      enum: ['slack', 'email', 'webhook', 'sms', 'in_app'],
      required: true,
    },

    recipientId: {
      type: String,
      required: true,
      index: true,
    },

    recipientType: {
      type: String,
      enum: ['user', 'agent', 'team', 'channel', 'webhook_url'],
    },

    title: String,

    body: {
      type: String,
      required: true,
    },

    templateId: String,

    templateData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
      default: 'pending',
      index: true,
    },

    sentAt: Date,

    readAt: Date,

    error: String,

    retryCount: {
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

notificationSchema.index({ status: 1, createdAt: 1 });
notificationSchema.index({ recipientId: 1, status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
