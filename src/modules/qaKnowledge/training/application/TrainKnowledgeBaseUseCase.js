'use strict';

class TrainKnowledgeBaseUseCase {
  constructor({ contentProcessor, logger }) {
    this.contentProcessor = contentProcessor;
    this.logger = logger;
  }

  async execute({ botId, scrapedContent, files }) {
    let markdownQAs = 0;
    let fileQAs = 0;
    const trainingFilesMeta = [];

    const isSpreadsheetFile = (file) =>
      [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ].includes(file.mimetype);

    if (scrapedContent && scrapedContent.length > 0) {
      try {
        markdownQAs = await this.contentProcessor.processMarkdownContent(
          scrapedContent,
          botId,
          null,
          null,
          null,
        );
      } catch (err) {
        this.logger.error('Markdown processing failed', { botId, error: err.message });
      }
    }

    if (files && files.length > 0) {
      const normalFiles = files.filter((f) => !isSpreadsheetFile(f));

      const fileResults = await Promise.allSettled(
        normalFiles.map((file) =>
          this.contentProcessor
            .processFile(file, botId, file.originalname, file.originalname, null)
            .then((result) => {
              if (result?.metadata?.hash) {
                trainingFilesMeta.push({
                  originalname: result.metadata.originalname,
                  mimeType: result.metadata.mimeType,
                  size: result.metadata.size,
                  hash: result.metadata.hash,
                  path: result.metadata.path,
                  uploadedAt: new Date(),
                });
              }
              return result.qaCount || 0;
            })
            .catch((err) => {
              this.logger.error('File processing failed', {
                botId,
                filename: file.originalname,
                error: err.message,
              });
              return 0;
            }),
        ),
      );

      fileQAs = fileResults
        .filter((r) => r.status === 'fulfilled')
        .reduce((sum, r) => sum + (r.value || 0), 0);
    }

    return { markdownQAs, fileQAs, trainingFilesMeta };
  }
}

module.exports = TrainKnowledgeBaseUseCase;
