const mongoose = require('mongoose');

const issueReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
    email: {
      type: String,
      trim: true,
      default: '',
      lowercase: true,
      maxlength: 200,
    },
    issueType: {
      type: String,
      enum: ['bug', 'ui', 'integration', 'performance', 'other'],
      default: 'other',
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['open', 'in_review', 'resolved'],
      default: 'open',
    },
    sourcePage: {
      type: String,
      trim: true,
      default: '/',
      maxlength: 300,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model('IssueReport', issueReportSchema);
