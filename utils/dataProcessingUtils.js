const fs = require('fs');
const crypto = require('crypto');
const QAHistory = require('../models/QAHistory');
const SpreadsheetConfig = require('../models/SpreadsheetConfig');
const {
  extractTextFromPDF,
  extractTextFromTXT,
  extractTextFromDOC,
  extractDataFromSpreadsheet,
  extractFromFile,
} = require('./textExtractor');
const { generateQAsViaGPT } = require('./gptUtils');
const { generateQAsWithLLM, generateEmbedding } = require('./llmClientUtils');
const { embedText } = require('./embedUtils');
const logger = require('./logger');

const computeFileHash = (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch (err) {
    logger.error('Error computing file hash', { filePath, error: err.message });
    return null;
  }
};

// Helper function to build persona context from bot configuration
function buildPersonaContext(bot) {
  if (!bot) {
    return null;
  }

  const personaParts = [];

  if (bot.primary_purpose) {
    personaParts.push(`Primary Purpose: ${bot.primary_purpose}`);
  }

  if (bot.conversation_tone) {
    personaParts.push(`Conversation Tone: ${bot.conversation_tone}`);
  }

  if (bot.response_style) {
    personaParts.push(`Response Style: ${bot.response_style}`);
  }

  if (bot.target_audience) {
    personaParts.push(`Target Audience: ${bot.target_audience}`);
  }

  if (bot.specialisation_area) {
    personaParts.push(`Specialisation Area: ${bot.specialisation_area}`);
  }

  if (bot.key_topics) {
    personaParts.push(`Key Topics: ${bot.key_topics}`);
  }

  if (bot.keywords) {
    personaParts.push(`Keywords: ${bot.keywords}`);
  }

  return personaParts.length > 0 ? personaParts.join('\n') : null;
}

// Helper function to process a single chunk
async function processChunk(chunk, botId, name, description, source, index, bot, sourceInfo = {}) {
  try {
    const personaContext = buildPersonaContext(bot);

    // Use custom LLM if available, otherwise use default
    const qas = bot?.custom_llm_provider
      ? await generateQAsWithLLM(chunk, name, description, bot, null, personaContext)
      : await generateQAsViaGPT(chunk, name, description, personaContext);

    // Process all Q&As in parallel
    const qaPromises = qas.map(async (qa) => {
      const { question, answer } = qa;

      if (question && answer) {
        // Use custom LLM for embedding if available
        const embedding = bot?.custom_llm_provider
          ? await generateEmbedding(question, bot)
          : await embedText(question);

        await QAHistory.create({
          bot: botId,
          question,
          answer,
          embedding: Buffer.from(embedding.buffer),
          source: sourceInfo.source || 'file',
          sourceFileName: sourceInfo.sourceFileName || source,
          sourceFileHash: sourceInfo.sourceFileHash || null,
        });

        return { success: true, question: `${question.substring(0, 50)}...` };
      }
      return { success: false };
    });

    const results = await Promise.allSettled(qaPromises);
    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;

    logger.debug(`Processed ${source} chunk`, {
      botId,
      index,
      successful,
      total: qas.length,
      usedCustomLLM: !!bot?.custom_llm_provider,
    });

    return { success: true, qaCount: successful };
  } catch (err) {
    logger.error(`Error processing ${source} chunk`, {
      botId,
      index,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
}

// Helper function to process markdown content
exports.processMarkdownContent = async (markdownArray, botId, name, description, bot) => {
  if (!markdownArray || markdownArray.length === 0) {
    return 0;
  }

  logger.info('Processing scraped markdown content for bot', {
    botId,
    pageCount: markdownArray.length,
    usedCustomLLM: !!bot?.custom_llm_provider,
  });

  // Process all markdown pages in parallel
  const pagePromises = markdownArray.map(async (markdown, i) => {
    if (!markdown || !markdown.trim()) {
      logger.warn('Skipping empty markdown content', { botId, index: i });
      return { pageIndex: i, qaCount: 0 };
    }

    logger.debug('Processing markdown page', {
      botId,
      pageIndex: i + 1,
      contentLength: markdown.length,
    });

    // Split markdown into chunks
    const chunks = markdown.match(/.{1,3000}/g) || [];

    // Process all chunks of this page in parallel
    const chunkPromises = chunks.map((chunk, j) =>
      processChunk(chunk, botId, name, description, `markdown page ${i + 1}`, j + 1, bot, {
        source: 'scrape',
        sourceFileName: `markdown page ${i + 1}`,
      }),
    );

    const chunkResults = await Promise.allSettled(chunkPromises);
    const qaCount = chunkResults
      .filter((r) => r.status === 'fulfilled' && r.value.success)
      .reduce((sum, r) => sum + r.value.qaCount, 0);

    return { pageIndex: i, qaCount };
  });

  const results = await Promise.allSettled(pagePromises);
  const totalQAs = results
    .filter((r) => r.status === 'fulfilled')
    .reduce((sum, r) => sum + r.value.qaCount, 0);

  logger.info('Completed processing scraped markdown content', {
    botId,
    pagesProcessed: markdownArray.length,
    totalQAs,
  });

  return totalQAs;
};

// Helper function to process PDF content
exports.processPDFContent = async (file, botId, name, description, bot) => {
  if (!file) {
    return 0;
  }

  logger.info('Processing uploaded PDF for bot', {
    botId,
    file: file.originalname,
    usedCustomLLM: !!bot?.custom_llm_provider,
  });

  const text = await extractTextFromPDF(file.path);

  if (!text || !text.trim()) {
    logger.warn('PDF extraction resulted in empty text', { botId });
    return 0;
  }

  const chunks = text.match(/.{1,3000}/g) || [];
  const fileHash = computeFileHash(file.path);

  // Process all PDF chunks in parallel
  const chunkPromises = chunks.map((chunk, i) =>
    processChunk(chunk, botId, name, description, 'PDF', i + 1, bot, {
      source: 'file',
      sourceFileName: file.originalname,
      sourceFileHash: fileHash,
    }),
  );

  const results = await Promise.allSettled(chunkPromises);
  const totalQAs = results
    .filter((r) => r.status === 'fulfilled' && r.value.success)
    .reduce((sum, r) => sum + r.value.qaCount, 0);

  logger.info('Completed processing PDF content', {
    botId,
    totalQAs,
  });

  return totalQAs;
};

/**
 * Process generic file content (PDF, TXT, DOC, XLSX, XLS, CSV)
 * Routes to appropriate handler based on file type
 */
exports.processFileContent = async (file, botId, name, description, bot) => {
  if (!file) {
    return { success: false, qaCount: 0, metadata: {} };
  }

  try {
    logger.info('Processing uploaded file for bot', {
      botId,
      file: file.originalname,
      size: file.size,
    });

    // Extract file content
    const extracted = await extractFromFile(file);
    const isSpreadsheet = extracted.metadata.isSpreadsheet;
    const fileHash = computeFileHash(file.path);

    if (isSpreadsheet) {
      // For spreadsheets, store configuration and return metadata
      return await exports.processSpreadsheetContent(
        file,
        botId,
        name,
        description,
        bot,
        extracted.metadata.firstSheet,
        fileHash,
      );
    } else {
      // For text files, process normally
      const text = extracted.content;

      if (!text || !text.trim()) {
        logger.warn('File extraction resulted in empty text', {
          botId,
          filename: file.originalname,
        });
        return { success: false, qaCount: 0, metadata: {} };
      }

      const chunks = text.match(/.{1,3000}/g) || [];

      // Process all chunks in parallel
      const chunkPromises = chunks.map((chunk, i) =>
        processChunk(chunk, botId, name, description, file.originalname, i + 1, bot, {
          source: 'file',
          sourceFileName: file.originalname,
          sourceFileHash: fileHash,
        }),
      );

      const results = await Promise.allSettled(chunkPromises);
      const totalQAs = results
        .filter((r) => r.status === 'fulfilled' && r.value.success)
        .reduce((sum, r) => sum + r.value.qaCount, 0);

      logger.info('Completed processing file content', {
        botId,
        filename: file.originalname,
        totalQAs,
      });

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
    }
  } catch (err) {
    logger.error('Error processing file content', {
      botId,
      filename: file.originalname,
      error: err.message,
    });
    return { success: false, qaCount: 0, metadata: {}, error: err.message };
  }
};

/**
 * Generate dataset description and field descriptions using LLM
 * Analyzes the data structure to understand what the dataset is about
 */
async function generateDatasetMetadata(sheetInfo, botId, fileName, bot) {
  try {
    const { getLLMClient } = require('./llmClientUtils');
    const llmClient = await getLLMClient(botId);

    // Get sample data for analysis
    const sampleRows = sheetInfo.data.slice(0, Math.min(5, sheetInfo.data.length));

    const prompt = `Analyze this dataset and provide metadata about it.

File: ${fileName}
Sheet: ${sheetInfo.name}
Columns: ${sheetInfo.columns.join(', ')}
Total Rows: ${sheetInfo.rowCount}

Sample Data (first few rows):
${sampleRows.map((row) => JSON.stringify(row)).join('\n')}

Provide a JSON response with this structure:
{
  "datasetDescription": "A concise description of what this dataset contains and its purpose (2-3 sentences)",
  "fieldDescriptions": {
    "column_name1": "Description of what this column contains and its purpose",
    "column_name2": "Description of what this column contains and its purpose"
  }
}

Return ONLY valid JSON, no markdown or extra text.`;

    const response = await llmClient.generateSummary(prompt);

    // Parse the JSON response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          datasetDescription:
            parsed.datasetDescription || 'Dataset containing business information',
          fieldDescriptions: parsed.fieldDescriptions || {},
        };
      }
    } catch (parseErr) {
      logger.warn('Could not parse dataset metadata response', { error: parseErr.message });
    }

    // Fallback metadata
    return {
      datasetDescription: `Dataset from ${fileName} containing ${sheetInfo.rowCount} rows and ${sheetInfo.columns.length} columns with the following fields: ${sheetInfo.columns.join(', ')}`,
      fieldDescriptions: sheetInfo.columns.reduce((acc, col) => {
        acc[col] = `Column containing data for ${col}`;
        return acc;
      }, {}),
    };
  } catch (err) {
    logger.error('Error generating dataset metadata', {
      botId,
      error: err.message,
    });

    // Return default metadata
    return {
      datasetDescription: `Dataset containing ${sheetInfo.rowCount} rows of data`,
      fieldDescriptions: {},
    };
  }
}

/**
 * Convert spreadsheet data to formatted string for LLM context
 * Creates a readable string representation of the entire dataset
 */
function convertDatasetToString(sheetInfo, datasetDescription) {
  let datasetString = `## Dataset: ${datasetDescription}\n\n`;
  datasetString += `**File**: ${sheetInfo.fileName || 'Unknown'}\n`;
  datasetString += `**Sheet**: ${sheetInfo.name}\n`;
  datasetString += `**Rows**: ${sheetInfo.rowCount}\n`;
  datasetString += `**Columns**: ${sheetInfo.columns.length}\n\n`;

  datasetString += `**Field Names**: ${sheetInfo.columns.join(', ')}\n\n`;

  datasetString += `**Data**:\n`;

  // Add column headers
  datasetString += `| ${sheetInfo.columns.join(' | ')} |\n`;
  datasetString += `| ${sheetInfo.columns.map(() => '---').join(' | ')} |\n`;

  // Add all data rows
  sheetInfo.data.forEach((row) => {
    const values = sheetInfo.columns.map((col) => {
      const val = row[col];
      return val !== null && val !== undefined ? String(val).substring(0, 50) : '-';
    });
    datasetString += `| ${values.join(' | ')} |\n`;
  });

  return datasetString;
}

/**
 * Process spreadsheet content - stores configuration and dataset in SpreadsheetConfig
 * Stores entire dataset as string along with metadata for later LLM analysis
 */
exports.processSpreadsheetContent = async (
  file,
  botId,
  name,
  description,
  bot,
  sheetInfo,
  fileHash = null,
) => {
  if (!sheetInfo || !sheetInfo.data || sheetInfo.data.length === 0) {
    logger.warn('Spreadsheet is empty', { botId, filename: file.originalname });
    return { success: false, qaCount: 0, metadata: { isSpreadsheet: true, empty: true } };
  }

  try {
    logger.info('Processing spreadsheet for bot', {
      botId,
      filename: file.originalname,
      sheetName: sheetInfo.name,
      columns: sheetInfo.columns,
      rows: sheetInfo.rowCount,
    });

    // Generate dataset metadata (description and field descriptions)
    const metadata = await generateDatasetMetadata(sheetInfo, botId, file.originalname, bot);

    // Convert entire dataset to formatted string
    const datasetDataAsString = convertDatasetToString(sheetInfo, metadata.datasetDescription);

    logger.info('Generated dataset metadata and string representation', {
      botId,
      datasetDescriptionLength: metadata.datasetDescription.length,
      datasetStringLength: datasetDataAsString.length,
      fieldCount: Object.keys(metadata.fieldDescriptions).length,
    });

    // Store spreadsheet configuration with all dataset information
    // All data is stored here - no separate QNA document created
    const spreadsheetConfig = await SpreadsheetConfig.create({
      bot: botId,
      fileName: file.originalname,
      sheetName: sheetInfo.name,
      availableColumns: sheetInfo.columns,
      data: sheetInfo.data,
      datasetDataAsString,
      datasetDescription: metadata.datasetDescription,
      fieldDescriptions: metadata.fieldDescriptions,
      rowCount: sheetInfo.rowCount,
      columnCount: sheetInfo.columns.length,
      isConfigured: false, // Will be configured by user later if needed
    });

    logger.info('Spreadsheet stored with dataset metadata', {
      botId,
      configId: spreadsheetConfig._id,
      columns: sheetInfo.columns.length,
      rows: sheetInfo.rowCount,
      datasetMetadataStored: true,
    });

    return {
      success: true,
      qaCount: 0, // No Q&As created - all data in SpreadsheetConfig
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
        datasetDescription: metadata.datasetDescription,
        datasetMetadataStored: true,
      },
    };
  } catch (err) {
    logger.error('Error processing spreadsheet content', {
      botId,
      filename: file.originalname,
      error: err.message,
      stack: err.stack,
    });
    return { success: false, qaCount: 0, metadata: { isSpreadsheet: true }, error: err.message };
  }
};

/**
 * Get Gemini's suggestions for output/input columns based on column names
 * Uses LLM to intelligently suggest which column is the target (output) and which are features
 */
exports.suggestColumnConfiguration = async (sheetInfo, botId) => {
  try {
    const { getLLMClient } = require('./llmClientUtils');
    const llmClient = await getLLMClient(botId);

    const prompt = `Given a spreadsheet with the following column names, suggest which column should be the output/prediction target and which columns should be input/feature columns.

Column names: ${sheetInfo.columns.join(', ')}

Sample data rows:
${sheetInfo.data
  .slice(0, 3)
  .map((row) => JSON.stringify(row))
  .join('\n')}

Respond in JSON format with this structure:
{
  "suggestedOutputColumn": "column_name",
  "suggestedInputColumns": ["col1", "col2", "col3"],
  "reasoning": "explanation of why these columns were chosen"
}`;

    const response = await llmClient.generateSummary(prompt);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      logger.warn('Could not parse Gemini column suggestion response', { error: parseErr.message });
    }

    return {
      suggestedOutputColumn: sheetInfo.columns[sheetInfo.columns.length - 1], // Default to last column
      suggestedInputColumns: sheetInfo.columns.slice(0, -1), // All except last as inputs
      reasoning: 'Default suggestion - last column as output, rest as inputs',
    };
  } catch (err) {
    logger.error('Error suggesting column configuration', {
      botId,
      error: err.message,
    });

    return {
      suggestedOutputColumn: null,
      suggestedInputColumns: [],
      reasoning: 'Error generating suggestions, manual configuration required',
    };
  }
};
