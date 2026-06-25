'use strict';

class WebScrapingFacade {
  constructor({ scraperProvider }) {
    this._scraperProvider = scraperProvider;
  }

  async discoverUrls({ url, limit, includeSubdomains, ignoreSitemap }) {
    const { urls } = await this._scraperProvider.discoverUrls({
      url,
      limit,
      includeSubdomains,
      ignoreSitemap,
    });
    return { urls };
  }

  async scrapeUrls({ urls, formats }) {
    const { externalJobId } = await this._scraperProvider.submitScrapeJob({ urls, formats });
    return { externalJobId };
  }

  async getScrapeResult(externalJobId) {
    return this._scraperProvider.getScrapeJobResult(externalJobId);
  }
}

module.exports = WebScrapingFacade;
