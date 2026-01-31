const QAHistory = require('../models/QAHistory');
const { extractTextFromPDF } = require('./textExtractor');
const { generateQAsViaGPT } = require('./gptUtils');
const { embedText } = require('./embedUtils');
const logger = require('./logger');

// Helper function to process a single chunk
async function processChunk(chunk, botId, name, description, source, index) {
  try {
    const qas = await generateQAsViaGPT(chunk, name, description);

    // Process all Q&As in parallel
    const qaPromises = qas.map(async (qa) => {
      const { question, answer } = qa;

      if (question && answer) {
        const embedding = await embedText(question);

        await QAHistory.create({
          bot: botId,
          question,
          answer,
          embedding: Buffer.from(embedding.buffer),
        });

        return { success: true, question: question.substring(0, 50) + '...' };
      }
      return { success: false };
    });

    const results = await Promise.allSettled(qaPromises);
    const successful = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;

    logger.debug(`Processed ${source} chunk`, {
      botId,
      index,
      successful,
      total: qas.length,
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
exports.processMarkdownContent = async (markdownArray, botId, name, description) => {
  if (!markdownArray || markdownArray.length === 0) {
    return 0;
  }

  logger.info('Processing scraped markdown content for bot', {
    botId,
    pageCount: markdownArray.length,
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
      processChunk(
        chunk,
        botId,
        name,
        description,
        `markdown page ${i + 1}`,
        j + 1
      )
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
}

// Helper function to process PDF content
exports.processPDFContent = async (file, botId, name, description) => {
  if (!file) {
    return 0;
  }

  logger.info('Processing uploaded PDF for bot', {
    botId,
    file: file.originalname,
  });

  const text = await extractTextFromPDF(file.path);

  if (!text || !text.trim()) {
    logger.warn('PDF extraction resulted in empty text', { botId });
    return 0;
  }

  const chunks = text.match(/.{1,3000}/g) || [];

  // Process all PDF chunks in parallel
  const chunkPromises = chunks.map((chunk, i) =>
    processChunk(chunk, botId, name, description, 'PDF', i + 1)
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
}
