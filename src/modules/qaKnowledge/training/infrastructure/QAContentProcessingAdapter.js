'use strict';

const { generateQAsViaGPT } = require('../../../../../utils/gptUtils');
const { generateQAsWithLLM, generateEmbedding } = require('../../../../../utils/llmClientUtils');
const { embedText } = require('../../../../../utils/embedUtils');
const { extractFromFile } = require('../../../../../utils/textExtractor');

const crypto = require('crypto');
const fs = require('fs');

const QAContentProcessor = require('../domain/contracts/QAContentProcessor');

class QAContentProcessingAdapter extends QAContentProcessor {
  constructor({ QAHistoryModel, SpreadsheetConfigModel, logger }) {
    super();
    this.QAHistoryModel = QAHistoryModel;
    this.SpreadsheetConfigModel = SpreadsheetConfigModel;
    this.logger = logger;
  }

  buildPersonaContext(botInfo) {
    if (!botInfo) {
      return null;
    }
    const parts = [];
    if (botInfo.primary_purpose) {
      parts.push(`Primary Purpose: ${botInfo.primary_purpose}`);
    }
    if (botInfo.conversation_tone) {
      parts.push(`Conversation Tone: ${botInfo.conversation_tone}`);
    }
    if (botInfo.response_style) {
      parts.push(`Response Style: ${botInfo.response_style}`);
    }
    if (botInfo.target_audience) {
      parts.push(`Target Audience: ${botInfo.target_audience}`);
    }
    if (botInfo.specialisation_area) {
      parts.push(`Specialisation Area: ${botInfo.specialisation_area}`);
    }
    if (botInfo.key_topics) {
      parts.push(`Key Topics: ${botInfo.key_topics}`);
    }
    if (botInfo.keywords) {
      parts.push(`Keywords: ${botInfo.keywords}`);
    }
    return parts.length > 0 ? parts.join('\n') : null;
  }

  _computeFileHash(filePath) {
    try {
      const data = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch {
      return null;
    }
  }

  async generateQAs(chunk, options) {
    const { name, description, personaContext, botInfo } = options;
    return botInfo?.custom_llm_provider
      ? generateQAsWithLLM(chunk, name, description, botInfo, null, personaContext)
      : generateQAsViaGPT(chunk, name, description, personaContext);
  }

  async generateEmbedding(text, options) {
    const { botInfo } = options;
    return botInfo?.custom_llm_provider ? generateEmbedding(text, botInfo) : embedText(text);
  }

  async processChunk(chunk, botId, name, description, source, index, botInfo, sourceInfo = {}) {
    try {
      const personaContext = this.buildPersonaContext(botInfo);
      const qas = await this.generateQAs(chunk, { name, description, personaContext, botInfo });

      const qaPromises = qas.map(async (qa) => {
        if (!qa.question || !qa.answer) {
          return { success: false };
        }

        const embedding = await this.generateEmbedding(qa.question, { botInfo });

        await this.QAHistoryModel.create({
          bot: botId,
          question: qa.question,
          answer: qa.answer,
          embedding: Buffer.from(embedding.buffer),
          source: sourceInfo.source || 'file',
          sourceFileName: sourceInfo.sourceFileName || source,
          sourceFileHash: sourceInfo.sourceFileHash || null,
        });

        return { success: true, question: `${qa.question.substring(0, 50)}...` };
      });

      const results = await Promise.allSettled(qaPromises);
      const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;

      return { success: true, qaCount: successful };
    } catch (err) {
      this.logger.error(`Error processing ${source} chunk`, { botId, index, error: err.message });
      return { success: false, error: err.message };
    }
  }

  async processMarkdownContent(markdownArray, botId, name, description, botInfo) {
    if (!markdownArray || markdownArray.length === 0) {
      return 0;
    }

    const pagePromises = markdownArray.map(async (markdown, i) => {
      if (!markdown || !markdown.trim()) {
        return { pageIndex: i, qaCount: 0 };
      }

      const chunks = markdown.match(/.{1,3000}/g) || [];

      const chunkPromises = chunks.map((chunk, j) =>
        this.processChunk(
          chunk,
          botId,
          name,
          description,
          `markdown page ${i + 1}`,
          j + 1,
          botInfo,
          {
            source: 'scrape',
            sourceFileName: `markdown page ${i + 1}`,
          },
        ),
      );

      const chunkResults = await Promise.allSettled(chunkPromises);
      const qaCount = chunkResults
        .filter((r) => r.status === 'fulfilled' && r.value.success)
        .reduce((sum, r) => sum + r.value.qaCount, 0);

      return { pageIndex: i, qaCount };
    });

    const results = await Promise.allSettled(pagePromises);
    return results
      .filter((r) => r.status === 'fulfilled')
      .reduce((sum, r) => sum + r.value.qaCount, 0);
  }

  async processFile(file, botId, name, description, botInfo) {
    try {
      const extracted = await extractFromFile(file);
      const isSpreadsheet = extracted.metadata.isSpreadsheet;
      const fileHash = this._computeFileHash(file.path);

      if (isSpreadsheet) {
        return this.processSpreadsheet(file, botId, fileHash, extracted, botInfo);
      }

      const text = extracted.content;
      if (!text || !text.trim()) {
        return { success: false, qaCount: 0, metadata: {} };
      }

      const chunks = text.match(/.{1,3000}/g) || [];
      const chunkPromises = chunks.map((chunk, i) =>
        this.processChunk(chunk, botId, name, description, file.originalname, i + 1, botInfo, {
          source: 'file',
          sourceFileName: file.originalname,
          sourceFileHash: fileHash,
        }),
      );

      const results = await Promise.allSettled(chunkPromises);
      const totalQAs = results
        .filter((r) => r.status === 'fulfilled' && r.value.success)
        .reduce((sum, r) => sum + r.value.qaCount, 0);

      return {
        success: true,
        qaCount: totalQAs,
        metadata: {
          fileType: extracted.type,
          originalname: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          hash: fileHash,
          path: file.path,
        },
      };
    } catch (err) {
      this.logger.error('Error processing file content', {
        botId,
        filename: file.originalname,
        error: err.message,
      });
      return { success: false, qaCount: 0, metadata: {}, error: err.message };
    }
  }

  async processSpreadsheet(file, botId, fileHash, extracted, _botInfo) {
    const sheetInfo = extracted.metadata.firstSheet;
    if (!sheetInfo || !sheetInfo.data || sheetInfo.data.length === 0) {
      return { success: false, qaCount: 0, metadata: { isSpreadsheet: true, empty: true } };
    }

    if (this.SpreadsheetConfigModel) {
      await this.SpreadsheetConfigModel.create({
        bot: botId,
        fileName: file.originalname,
        sheetName: sheetInfo.name,
        availableColumns: sheetInfo.columns,
        data: sheetInfo.data,
        rowCount: sheetInfo.rowCount,
        columnCount: sheetInfo.columns.length,
        isConfigured: false,
      });
    }

    return {
      success: true,
      qaCount: 0,
      metadata: {
        isSpreadsheet: true,
        sheetName: sheetInfo.name,
        columns: sheetInfo.columns,
        rowCount: sheetInfo.rowCount,
        needsConfiguration: true,
        originalname: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        hash: fileHash,
        path: file.path,
      },
    };
  }
}

module.exports = QAContentProcessingAdapter;
