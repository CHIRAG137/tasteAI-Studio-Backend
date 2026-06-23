'use strict';

const IWebScraperService = require('../../domain/services/IWebScraperService');

/**
 * FirecrawlScraperService — concrete implementation of IWebScraperService
 * backed by the Firecrawl REST API.
 *
 * Single Responsibility: translate between domain value objects and the
 * Firecrawl API's request/response shapes. No business logic lives here
 * — orchestration belongs in the use cases.
 *
 * Open/Closed: to switch to a different provider (Apify, Puppeteer
 * cluster, etc.), write a new class that extends IWebScraperService and
 * register it in the composition root. Nothing else changes.
 */
class FirecrawlScraperService extends IWebScraperService {
  /**
   * @param {import('axios').AxiosInstance} firecrawlClient
   */
  constructor(firecrawlClient) {
    super();
    this._client = firecrawlClient;
  }

  /**
   * @param {import('../../domain/valueObjects/CrawlOptions')} options
   * @returns {Promise<{ urls: string[] }>}
   */
  async discoverUrls(options) {
    const response = await this._client.post('/map', {
      url: options.url,
      limit: options.limit,
      includeSubdomains: options.includeSubdomains,
      ignoreSitemap: options.ignoreSitemap,
    });

    // Normalise the provider response into a stable domain shape
    const urls = response.data?.links ?? response.data?.results ?? [];
    return { urls };
  }

  /**
   * @param {import('../../domain/valueObjects/ScrapeOptions')} options
   * @returns {Promise<{ externalJobId: string }>}
   */
  async submitScrapeJob(options) {
    const response = await this._client.post('/batch/scrape', {
      urls: options.urls,
      formats: options.formats,
    });

    const externalJobId = response.data?.id ?? response.data?.jobId;
    if (!externalJobId) {
      throw new Error('Firecrawl did not return a job ID for the batch scrape request');
    }
    return { externalJobId };
  }

  /**
   * @param {string} externalJobId
   * @returns {Promise<{ status: string, data?: object }>}
   */
  async getScrapeJobResult(externalJobId) {
    const response = await this._client.get(`/batch/scrape/${externalJobId}`);
    const { status, data } = response.data;

    // Map Firecrawl-specific statuses to the domain's stable vocabulary
    const domainStatus = FirecrawlScraperService._mapStatus(status);
    return { status: domainStatus, data };
  }

  static _mapStatus(firecrawlStatus) {
    const map = {
      completed: 'completed',
      in_progress: 'in_progress',
      scraping: 'in_progress', // Firecrawl uses both terms
      failed: 'failed',
    };
    return map[firecrawlStatus] ?? 'unknown';
  }
}

module.exports = FirecrawlScraperService;
