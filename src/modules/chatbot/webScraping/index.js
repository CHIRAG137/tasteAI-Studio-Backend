'use strict';

const { createFirecrawlClient } = require('./infrastructure/http/FirecrawlClient');
const FirecrawlScraperService = require('./infrastructure/scrapers/FirecrawlScraperService');
const MongoCrawlJobRepository = require('./infrastructure/persistence/MongoCrawlJobRepository');
const CrawlWebsiteUseCase = require('./application/usecases/CrawlWebsiteUseCase');
const ScrapeUrlsUseCase = require('./application/usecases/ScrapeUrlsUseCase');
const GetScrapeResultUseCase = require('./application/usecases/GetScrapeResultUseCase');
const WebScrapingController = require('./api/controllers/WebScrapingController');
const { createWebScrapingRoutes } = require('./api/routes/WebScrapingRoutes');

/**
 * createWebScrapingSubModule — internal composition root for the
 * website-scraping sub-feature of the chatbot module.
 *
 * This is NOT a top-level service entrypoint. It wires all dependencies
 * for this sub-feature and returns its Express router to be mounted by
 * the parent chatbot module (../index.js).
 *
 * To add a new scraping provider: implement IWebScraperService, swap the
 * concrete class below. Nothing else in this file or any other changes.
 *
 * @param {object} [opts]
 * @param {Function} [opts.authGuard] — auth middleware forwarded from the parent module
 * @returns {{ router: import('express').Router }}
 */
function createWebScrapingSubModule({ authGuard } = {}) {
  // ── Infrastructure ─────────────────────────────────────────────────────────
  const firecrawlClient = createFirecrawlClient();
  const scraperService = new FirecrawlScraperService(firecrawlClient);
  const crawlJobRepository = new MongoCrawlJobRepository();

  // ── Application ────────────────────────────────────────────────────────────
  const crawlWebsiteUseCase = new CrawlWebsiteUseCase({ scraperService, crawlJobRepository });
  const scrapeUrlsUseCase = new ScrapeUrlsUseCase({ scraperService, crawlJobRepository });
  const getScrapeResultUseCase = new GetScrapeResultUseCase({ scraperService, crawlJobRepository });

  // ── API ────────────────────────────────────────────────────────────────────
  const webScrapingController = new WebScrapingController({
    crawlWebsiteUseCase,
    scrapeUrlsUseCase,
    getScrapeResultUseCase,
  });

  const router = createWebScrapingRoutes({ webScrapingController, authGuard });

  return { router };
}

module.exports = { createWebScrapingSubModule };
