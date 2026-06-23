'use strict';

/**
 * WebScrapingController — HTTP adapter layer.
 *
 * Single Responsibility: translate HTTP requests into use-case commands
 * and HTTP responses from use-case results. Zero business logic lives
 * here — all decisions are delegated to the injected use cases.
 *
 * All use cases are injected at construction time (Dependency Inversion).
 */
class WebScrapingController {
  /**
   * @param {object} deps
   * @param {import('../../application/usecases/CrawlWebsiteUseCase')}    deps.crawlWebsiteUseCase
   * @param {import('../../application/usecases/ScrapeUrlsUseCase')}      deps.scrapeUrlsUseCase
   * @param {import('../../application/usecases/GetScrapeResultUseCase')} deps.getScrapeResultUseCase
   */
  constructor({ crawlWebsiteUseCase, scrapeUrlsUseCase, getScrapeResultUseCase }) {
    this._crawlWebsiteUseCase = crawlWebsiteUseCase;
    this._scrapeUrlsUseCase = scrapeUrlsUseCase;
    this._getScrapeResultUseCase = getScrapeResultUseCase;

    // Bind so methods can be passed directly as Express route handlers
    this.crawlWebsite = this.crawlWebsite.bind(this);
    this.scrapeUrls = this.scrapeUrls.bind(this);
    this.getScrapeResultByJobId = this.getScrapeResultByJobId.bind(this);
  }

  /**
   * POST /api/scrape/search-urls
   */
  async crawlWebsite(req, res) {
    try {
      const { botId, url, limit, includeSubdomains, ignoreSitemap } = req.body;
      const result = await this._crawlWebsiteUseCase.execute({
        botId,
        url,
        limit,
        includeSubdomains,
        ignoreSitemap,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      return WebScrapingController._handleError(res, error);
    }
  }

  /**
   * POST /api/scrape/urls
   */
  async scrapeUrls(req, res) {
    try {
      const { jobId, urls, formats } = req.body;
      const result = await this._scrapeUrlsUseCase.execute({ jobId, urls, formats });
      return res.status(202).json({ success: true, data: result });
    } catch (error) {
      return WebScrapingController._handleError(res, error);
    }
  }

  /**
   * GET /api/scrape/result/:jobId
   */
  async getScrapeResultByJobId(req, res) {
    try {
      const { jobId } = req.params;
      const result = await this._getScrapeResultUseCase.execute({ jobId });

      const httpStatus = result.status === 'in_progress' ? 202 : 200;
      return res.status(httpStatus).json({ success: true, data: result });
    } catch (error) {
      return WebScrapingController._handleError(res, error);
    }
  }

  /** @private */
  static _handleError(res, error) {
    const isValidationError =
      error.message?.startsWith('CrawlOptions:') || error.message?.startsWith('ScrapeOptions:');

    if (isValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.statusCode === 429) {
      return res.status(429).json({
        success: false,
        message: 'Scraping provider rate limit hit. Please try again later.',
      });
    }
    return res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
  }
}

module.exports = WebScrapingController;
