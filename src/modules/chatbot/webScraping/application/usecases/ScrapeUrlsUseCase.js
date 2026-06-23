'use strict';

const ScrapeOptions = require('../../domain/valueObjects/ScrapeOptions');

/**
 * ScrapeUrlsUseCase — submits a batch of URLs to the scraping provider
 * and records the resulting external job ID on the CrawlJob entity.
 *
 * Single Responsibility: only submission. Polling belongs to
 * GetScrapeResultUseCase.
 */
class ScrapeUrlsUseCase {
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
   * @param {object}   command
   * @param {string}   command.jobId   — internal CrawlJob ID from CrawlWebsiteUseCase
   * @param {string[]} command.urls    — URLs to scrape (may differ from discoveredUrls)
   * @param {string[]} [command.formats]
   * @returns {Promise<{ externalJobId: string }>}
   */
  async execute({ jobId, urls, formats }) {
    const crawlJob = await this._crawlJobRepository.findById(jobId);
    if (!crawlJob) {
      throw new Error(`CrawlJob "${jobId}" not found`);
    }

    const options = new ScrapeOptions({ urls, formats });
    const { externalJobId } = await this._scraperService.submitScrapeJob(options);

    crawlJob.markInProgress(externalJobId);
    await this._crawlJobRepository.save(crawlJob);

    return { externalJobId };
  }
}

module.exports = ScrapeUrlsUseCase;
