'use strict';

const ApiResponse = require('../../../../shared/response/ApiResponse');

class WebScrapingController {
  constructor({ webScrapingFacade }) {
    this._facade = webScrapingFacade;

    this.crawlWebsite = this.crawlWebsite.bind(this);
    this.scrapeUrls = this.scrapeUrls.bind(this);
    this.getScrapeResultByJobId = this.getScrapeResultByJobId.bind(this);
  }

  async crawlWebsite(req, res) {
    const { url, limit, includeSubdomains, ignoreSitemap } = req.body;
    const result = await this._facade.discoverUrls({
      url,
      limit,
      includeSubdomains,
      ignoreSitemap,
    });
    return ApiResponse.success(res, result, 'URL discovery completed');
  }

  async scrapeUrls(req, res) {
    const { urls, formats } = req.body;
    const result = await this._facade.scrapeUrls({ urls, formats });
    return ApiResponse.accepted(res, result, 'Scrape job submitted');
  }

  async getScrapeResultByJobId(req, res) {
    const { jobId } = req.params;
    const result = await this._facade.getScrapeResult(jobId);

    if (result.status === 'in_progress') {
      return ApiResponse.accepted(res, result, 'Job is still in progress');
    }
    return ApiResponse.success(res, result, 'Job completed');
  }
}

module.exports = WebScrapingController;
