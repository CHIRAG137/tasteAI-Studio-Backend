'use strict';

const CrawlJob = require('../../domain/entities/CrawlJob');
const CrawlOptions = require('../../domain/valueObjects/CrawlOptions');

/**
 * CrawlWebsiteUseCase — discovers internal URLs from a seed URL.
 *
 * Orchestrates the domain and infrastructure without containing any
 * provider-specific knowledge. The scraper and repository are injected
 * at construction time (Dependency Inversion Principle).
 *
 * Single Responsibility: this class only orchestrates URL discovery.
 * Saving, scraping, and polling each belong to their own use cases.
 */
class CrawlWebsiteUseCase {
  /**
   * @param {object} deps
   * @param {import('../../domain/services/IWebScraperService')}    deps.scraperService
   * @param {import('../../domain/repositories/ICrawlJobRepository')} deps.crawlJobRepository
   */
  constructor({ scraperService, crawlJobRepository }) {
    this._scraperService = scraperService;
    this._crawlJobRepository = crawlJobRepository;
  }

  /**
   * @param {object} command
   * @param {string}  command.botId
   * @param {string}  command.url
   * @param {number}  [command.limit]
   * @param {boolean} [command.includeSubdomains]
   * @param {boolean} [command.ignoreSitemap]
   * @returns {Promise<{ jobId: string, discoveredUrls: string[] }>}
   */
  async execute({ botId, url, limit, includeSubdomains, ignoreSitemap }) {
    // Value object validates all input — throws with a clear message if invalid
    const options = new CrawlOptions({ url, limit, includeSubdomains, ignoreSitemap });

    const { urls: discoveredUrls } = await this._scraperService.discoverUrls(options);

    const crawlJob = new CrawlJob({
      id: undefined, // assigned by repository on first save
      botId,
      seedUrl: options.url,
      discoveredUrls,
      status: CrawlJob.STATUS.PENDING,
    });

    const saved = await this._crawlJobRepository.save(crawlJob);

    return {
      jobId: saved.id,
      discoveredUrls: saved.discoveredUrls,
    };
  }
}

module.exports = CrawlWebsiteUseCase;
