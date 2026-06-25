const mongoose = require('mongoose');

const QAHistorySchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
    },

    question: String,

    answer: String,

    embedding: Buffer,

    source: {
      type: String,
      default: 'file',
    },

    sourceFileName: String,

    sourceFileHash: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('QAHistory', QAHistorySchema);
