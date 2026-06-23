'use strict';

const CrawlJob = require('../../domain/entities/CrawlJob');

/**
 * GetScrapeResultUseCase — polls the scraping provider for a job's
 * current status and updates the CrawlJob entity accordingly.
 *
 * Single Responsibility: only polling and status projection.
 */
class GetScrapeResultUseCase {
  /**
   * @param {object} deps
   * @param {import('../../domain/services/IWebScraperService')}      deps.scraperService
   * @param {import('../../domain/repositories/ICrawlJobRepository')}  deps.crawlJobRepository
   */
  constructor({ scraperService, crawlJobRepository }) {
    this._scraperService = scraperService;
    this._crawlJobRepository = crawlJobRepository;
  }

  /**
   * @param {object} query
   * @param {string} query.jobId  — internal CrawlJob ID
   * @returns {Promise<{ status: string, data?: object, message: string }>}
   */
  async execute({ jobId }) {
    const crawlJob = await this._crawlJobRepository.findById(jobId);
    if (!crawlJob) {
      throw new Error(`CrawlJob "${jobId}" not found`);
    }

    // Already terminal — return persisted result without hitting the provider
    if (crawlJob.isCompleted()) {
      return {
        status: CrawlJob.STATUS.COMPLETED,
        data: crawlJob.result,
        message: 'Job completed.',
      };
    }

    const { status, data } = await this._scraperService.getScrapeJobResult(crawlJob.externalJobId);

    if (status === 'in_progress') {
      return { status: CrawlJob.STATUS.IN_PROGRESS, message: 'Job is still in progress.' };
    }

    if (status === 'completed') {
      crawlJob.markCompleted(data);
      await this._crawlJobRepository.save(crawlJob);
      return { status: CrawlJob.STATUS.COMPLETED, data, message: 'Job completed.' };
    }

    if (status === 'failed') {
      crawlJob.markFailed();
      await this._crawlJobRepository.save(crawlJob);
      return { status: CrawlJob.STATUS.FAILED, message: 'Job failed at the scraping provider.' };
    }

    // Unknown status — surface it without crashing the system
    return { status: 'unknown', message: `Unexpected provider status: ${status}` };
  }
}

module.exports = GetScrapeResultUseCase;
