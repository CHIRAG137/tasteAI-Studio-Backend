'use strict';

/**
 * IWebScraperService — abstract port (interface) for web scraping providers.
 *
 * Defines the contract that any scraping provider (Firecrawl, Apify,
 * Puppeteer, etc.) must fulfil. Application use cases depend only on this
 * interface — never on a concrete provider — making the provider
 * swappable without touching business logic (Dependency Inversion Principle).
 *
 * Concrete providers implement this class and override all three methods.
 *
 * @abstract
 */
class IWebScraperService {
  /**
   * Crawl a seed URL and return a list of discovered internal URLs.
   *
   * @param   {import('../valueObjects/CrawlOptions')} options
   * @returns {Promise<{ urls: string[] }>}
   */

  async discoverUrls(options) {
    throw new Error(`${this.constructor.name} must implement discoverUrls()`);
  }

  /**
   * Submit a batch of URLs for content scraping and return a provider
   * job ID that can be polled later.
   *
   * @param   {import('../valueObjects/ScrapeOptions')} options
   * @returns {Promise<{ externalJobId: string }>}
   */

  async submitScrapeJob(options) {
    throw new Error(`${this.constructor.name} must implement submitScrapeJob()`);
  }

  /**
   * Poll the result of a previously submitted scrape job.
   *
   * @param   {string} externalJobId
   * @returns {Promise<{ status: 'in_progress' | 'completed' | 'failed', data?: object }>}
   */

  async getScrapeJobResult(externalJobId) {
    throw new Error(`${this.constructor.name} must implement getScrapeJobResult()`);
  }
}

module.exports = IWebScraperService;
