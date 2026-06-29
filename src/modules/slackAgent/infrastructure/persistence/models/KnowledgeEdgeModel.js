'use strict';

const mongoose = require('mongoose');

const RELATIONSHIP_TYPES = [
  // Communication
  'SENT_BY', 'POSTED_IN', 'PART_OF_THREAD', 'REPLIES_TO', 'MENTIONS', 'MENTIONED_IN',
  // Original backward-compat
  'sent', 'mentions', 'replies_to', 'in_channel', 'reacted', 'references',
  'thread_participant', 'direct_message', 'parent_child',
  // Knowledge
  'ABOUT', 'REFERENCES', 'USES', 'IMPLEMENTS', 'DEPENDS_ON', 'CALLS', 'IMPORTS',
  'DEFINES', 'EXPLAINS', 'RELATES_TO', 'CONFLICTS_WITH',
  // Decision
  'PROPOSES', 'APPROVES', 'REJECTS', 'SUPPORTS', 'OPPOSES', 'SUPERSEDES',
  // Task
  'CREATES_TASK', 'ASSIGNED_TO', 'BLOCKS', 'COMPLETED_BY', 'REQUESTS',
  // Incident
  'CAUSES', 'FIXES', 'AFFECTS', 'MITIGATES',
  // Time
  'HAS_DEADLINE', 'STARTS_ON', 'ENDS_ON', 'HAPPENED_AT',
];

const edgeMetadataSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const knowledgeEdgeSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SlackWorkspace',
      required: true,
      index: true,
    },
    sourceNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeNode',
      required: true,
      index: true,
    },
    targetNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeNode',
      required: true,
      index: true,
    },
    sourceExternalId: {
      type: String,
      required: true,
    },
    targetExternalId: {
      type: String,
      required: true,
    },
    relationshipType: {
      type: String,
      enum: RELATIONSHIP_TYPES,
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      description: 'Human-readable label for the relationship',
    },
    weight: {
      type: Number,
      default: 1.0,
    },
    confidence: {
      type: Number,
      default: 1.0,
      description: 'AI confidence score for this relationship',
    },
    reason: {
      type: String,
      default: '',
      description: 'Reason for creating this relationship',
    },
    metadata: [edgeMetadataSchema],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

knowledgeEdgeSchema.index({ organizationId: 1, sourceNodeId: 1, relationshipType: 1 });
knowledgeEdgeSchema.index({ organizationId: 1, targetNodeId: 1, relationshipType: 1 });
knowledgeEdgeSchema.index({ organizationId: 1, workspaceId: 1, relationshipType: 1 });
knowledgeEdgeSchema.index({ sourceExternalId: 1, targetExternalId: 1, relationshipType: 1 }, { unique: true });
knowledgeEdgeSchema.index({ relationshipType: 1, weight: -1 });

const KnowledgeEdgeModel = mongoose.model('KnowledgeEdge', knowledgeEdgeSchema);

if (mongoose.connection.readyState === 1) {
  KnowledgeEdgeModel.collection.dropIndex('sourceNodeId_1_targetNodeId_1_relationshipType_1').catch(() => {});
} else {
  mongoose.connection.once('open', () => {
    KnowledgeEdgeModel.collection.dropIndex('sourceNodeId_1_targetNodeId_1_relationshipType_1').catch(() => {});
  });
}

module.exports = KnowledgeEdgeModel;
