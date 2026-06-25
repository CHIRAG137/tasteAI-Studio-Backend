'use strict';

const ScraperProviderTypes = require('./ScraperProviderTypes');
const logger = require('../../../../shared/logging');

class FirecrawlScraperProvider {
  constructor(firecrawlClient) {
    this._client = firecrawlClient;
  }

  getType() {
    return ScraperProviderTypes.FIRECRAWL;
  }

  async discoverUrls({ url, limit = 100, includeSubdomains = true, ignoreSitemap = true }) {
    logger.info('Discovering URLs', { url, limit });
    const response = await this._client.post('/map', {
      url,
      limit,
      includeSubdomains,
      ignoreSitemap,
    });

    const urls = response.data?.links ?? response.data?.results ?? [];
    logger.info('URL discovery completed', { url, count: urls.length });
    return { urls };
  }

  async submitScrapeJob({ urls, formats }) {
    logger.info('Submitting scrape job', { urlCount: urls.length, formats });
    const response = await this._client.post('/batch/scrape', { urls, formats });

    const externalJobId = response.data?.id ?? response.data?.jobId;
    if (!externalJobId) {
      logger.error('Firecrawl did not return a job ID', { responseData: response.data });
      throw new Error('Firecrawl did not return a job ID for the batch scrape request');
    }
    logger.info('Scrape job submitted', { externalJobId });
    return { externalJobId };
  }

  async getScrapeJobResult(externalJobId) {
    logger.info('Polling scrape job result', { externalJobId });
    const response = await this._client.get(`/batch/scrape/${externalJobId}`);
    const { status, data } = response.data;
    const mappedStatus = FirecrawlScraperProvider._mapStatus(status);
    logger.info('Scrape job result received', { externalJobId, status: mappedStatus });
    return { status: mappedStatus, data };
  }

  static _mapStatus(firecrawlStatus) {
    const map = {
      completed: 'completed',
      in_progress: 'in_progress',
      scraping: 'in_progress',
      failed: 'failed',
    };
    return map[firecrawlStatus] ?? 'unknown';
  }
}

module.exports = FirecrawlScraperProvider;
