const mongoose = require('mongoose');

const SpreadsheetConfigSchema = new mongoose.Schema(
  {
    bot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatBot',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    sheetName: {
      type: String,
      required: true,
    },
    // Column names available in the spreadsheet
    availableColumns: [String],
    // Output column for prediction (the column to predict)
    outputColumn: {
      type: String,
      required: false,
    },
    // Input columns for features (columns to use as features for prediction)
    inputColumns: [String],
    // Raw spreadsheet data for reference
    data: [mongoose.Schema.Types.Mixed],
    // Metadata about the spreadsheet
    rowCount: Number,
    columnCount: Number,
    isConfigured: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SpreadsheetConfig', SpreadsheetConfigSchema);
