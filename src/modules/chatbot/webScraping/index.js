'use strict';

const { createFirecrawlClient } = require('./infrastructure/strategies/FirecrawlClient');
const FirecrawlScraperProvider = require('./infrastructure/providers/FirecrawlScraperProvider');
const ScraperProviderFactory = require('./infrastructure/providers/ScraperProviderFactory');
const WebScrapingFacade = require('./application/facades/WebScrapingFacade');
const WebScrapingController = require('./presentation/controllers/WebScrapingController');
const { createWebScrapingRoutes } = require('./presentation/routes/WebScrapingRoutes');

function createWebScrapingSubModule({ authGuard } = {}) {
  const firecrawlClient = createFirecrawlClient();
  const firecrawlProvider = new FirecrawlScraperProvider(firecrawlClient);

  const providerFactory = new ScraperProviderFactory();
  providerFactory.register(firecrawlProvider);

  const webScrapingFacade = new WebScrapingFacade({ scraperProvider: firecrawlProvider });

  const webScrapingController = new WebScrapingController({ webScrapingFacade });

  const router = createWebScrapingRoutes({ webScrapingController, authGuard });

  return { router };
}

module.exports = { createWebScrapingSubModule };
