'use strict';

const mongoose = require('mongoose');

const NODE_TYPES = [
  // Original
  'user',
  'message',
  'channel',
  // People
  'person',
  'team',
  'department',
  'role',
  // Technical
  'technology',
  'programming_language',
  'framework',
  'library',
  'api',
  'database',
  'repository',
  'branch',
  'file',
  'folder',
  'class',
  'function',
  'service',
  'microservice',
  'endpoint',
  // Business
  'project',
  'product',
  'feature',
  'requirement',
  'customer',
  'company',
  'deal',
  'contract',
  // Knowledge
  'topic',
  'concept',
  'documentation',
  'wiki',
  'rfc',
  'meeting',
  'architecture',
  'design_pattern',
  // Reasoning
  'decision',
  'proposal',
  'question',
  'answer',
  'idea',
  'opinion',
  'assumption',
  'constraint',
  'risk',
  // Work Tracking
  'task',
  'action_item',
  'issue',
  'bug',
  'incident',
  'pull_request',
  'commit',
  'deployment',
  'release',
  'version',
  'sprint',
  'milestone',
  // Time
  'date',
  'time',
  'deadline',
];

const nodeMetadataSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false },
);

const knowledgeNodeSchema = new mongoose.Schema(
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
    nodeType: {
      type: String,
      enum: NODE_TYPES,
      required: true,
      index: true,
    },
    externalId: {
      type: String,
      required: true,
      description: 'Slack native ID or generated unique ID',
    },
    label: {
      type: String,
      required: true,
      description: 'Human-readable label',
    },
    canonicalName: {
      type: String,
      default: '',
      description: 'Standardized canonical name for deduplication',
    },
    aliases: {
      type: [String],
      default: [],
      description: 'Alternative names for this entity',
    },
    description: {
      type: String,
      default: '',
      description: 'Brief description of the entity',
    },
    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    text: {
      type: String,
      default: '',
      description: 'Full text content (for messages)',
    },
    cleanedText: {
      type: String,
      default: '',
      description: 'Cleaned text without mentions/URLs',
    },
    metadata: [nodeMetadataSchema],
    vectorIds: [String],
    embedding: { type: [Number], default: undefined },
    mentionUserIds: [String],
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    channelSlackId: String,
    userSlackId: String,
    threadTs: String,

    // AI-extracted semantic metadata
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral', 'mixed', ''],
      default: '',
    },
    emotion: {
      type: String,
      default: '',
    },
    intent: {
      type: String,
      default: '',
    },
    urgency: {
      type: Number,
      default: 0,
    },
    importanceScore: {
      type: Number,
      default: 0,
    },
    confidenceScore: {
      type: Number,
      default: 0,
    },
    summary: {
      type: String,
      default: '',
    },
    keywords: [String],
    topics: [String],
    language: {
      type: String,
      default: 'en',
    },

    // Message flags
    isQuestion: { type: Boolean, default: false },
    isDecision: { type: Boolean, default: false },
    isTask: { type: Boolean, default: false },
    isBug: { type: Boolean, default: false },
    isIncident: { type: Boolean, default: false },
    hasDeadline: { type: Boolean, default: false },
    isMeetingNotes: { type: Boolean, default: false },
    isAnnouncement: { type: Boolean, default: false },
    isProposal: { type: Boolean, default: false },
    isCodeDiscussion: { type: Boolean, default: false },

    // Task extraction
    taskDescription: { type: String, default: '' },
    taskOwner: { type: String, default: '' },
    taskDeadline: { type: String, default: '' },
    taskPriority: { type: String, default: '' },
    taskStatus: { type: String, default: '' },

    // Decision extraction
    decisionMade: { type: String, default: '' },
    decisionReason: { type: String, default: '' },
    rejectedAlternatives: [String],
    affectedSystems: [String],
    impact: { type: String, default: '' },

    // Question extraction
    questionText: { type: String, default: '' },
    expectedResponder: { type: String, default: '' },
    questionTopic: { type: String, default: '' },
    questionUrgency: { type: String, default: '' },

    // Risk extraction
    risks: [String],
    blockers: [String],
    assumptions: [String],
    constraints: [String],
    riskSeverity: { type: String, default: '' },

    // Knowledge extraction
    knowledgeCreated: [String],
    knowledgeUpdated: [String],
    knowledgeContradicted: [String],
    knowledgeRemoved: [String],

    // Search metadata
    retrievalKeywords: [String],
    semanticKeywords: [String],
    graphTags: [String],
    searchQueries: [String],
    embeddingText: { type: String, default: '' },

    // Source tracking
    sourceMessageId: {
      type: String,
      default: '',
      description: 'External ID of the source message that created this node',
    },
    createdTimestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

knowledgeNodeSchema.index(
  { organizationId: 1, workspaceId: 1, externalId: 1, nodeType: 1 },
  { unique: true },
);
knowledgeNodeSchema.index({ text: 'text', label: 'text' });
knowledgeNodeSchema.index({ organizationId: 1, workspaceId: 1, 'properties.key': 1 });
knowledgeNodeSchema.index({ organizationId: 1, mentionUserIds: 1 });
knowledgeNodeSchema.index({ canonicalName: 1 });
knowledgeNodeSchema.index({ nodeType: 1, importanceScore: -1 });

module.exports = mongoose.model('KnowledgeNode', knowledgeNodeSchema);
