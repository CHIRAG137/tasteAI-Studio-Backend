const mongoose = require('mongoose');

const RegressionTestCaseSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  question: { type: String, required: true },
  expectedAnswer: { type: String, required: true },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  source: {
    type: String,
    enum: ['low_confidence', 'handoff', 'negative_feedback', 'manual'],
    required: true,
  },
  createdFrom: {
    sessionId: String,
    conversationId: String,
    score: Number,
  },
  createdAt: { type: Date, default: Date.now },
});

const RegressionTestRunSchema = new mongoose.Schema({
  testCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'BotRegressionTest', required: true },
  botVersionId: { type: String, required: true },
  actualAnswer: { type: String, required: true },
  relevanceScore: { type: Number, min: 0, max: 1 },
  groundednessScore: { type: Number, min: 0, max: 1 },
  verdict: {
    type: String,
    enum: ['passed', 'failed', 'regressed', 'improved'],
    required: true,
  },
  explanation: String,
  runAt: { type: Date, default: Date.now },
});

const BotRegressionTestSchema = new mongoose.Schema({
  bot: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatBot', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  testCases: [RegressionTestCaseSchema],
  lastRunAt: Date,
  status: {
    type: String,
    enum: ['active', 'archived', 'disabled'],
    default: 'active',
  },
  statistics: {
    totalTests: { type: Number, default: 0 },
    passedTests: { type: Number, default: 0 },
    failedTests: { type: Number, default: 0 },
    regressions: { type: Number, default: 0 },
    improvements: { type: Number, default: 0 },
  },
  testRuns: [RegressionTestRunSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('BotRegressionTest', BotRegressionTestSchema);
