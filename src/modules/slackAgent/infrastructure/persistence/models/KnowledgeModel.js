'use strict';

const mongoose = require('mongoose');

const knowledgeSchema = new mongoose.Schema(
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

    sourceType: {
      type: String,
      enum: ['pdf', 'url', 'notion', 'google_drive', 'confluence', 'manual', 'api'],
      required: true,
    },

    sourceUrl: String,

    content: String,

    contentType: String,

    fileUrl: String,

    fileSize: Number,

    vectorIds: [String],

    indexStatus: {
      type: String,
      enum: ['pending', 'indexing', 'indexed', 'failed'],
      default: 'pending',
    },

    embeddingModel: String,

    chunkCount: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    tags: [String],

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    uploadedById: {
      type: mongoose.Schema.Types.ObjectId,
    },

    lastIndexedAt: Date,

    expiresAt: Date,
  },
  {
    timestamps: true,
  },
);

knowledgeSchema.index({ organizationId: 1, sourceType: 1 });
knowledgeSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Knowledge', knowledgeSchema);
