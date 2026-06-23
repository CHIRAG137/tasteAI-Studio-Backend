'use strict';

const express = require('express');

/**
 * createWebScrapingRoutes — factory that returns an Express router
 * with all website-scraping endpoints wired to the injected controller.
 *
 * Routes are deliberately thin: no middleware logic lives here beyond
 * what is genuinely route-level (auth guard injection). Business logic
 * belongs in use cases, HTTP concerns belong in the controller.
 *
 * @param {object} deps
 * @param {import('../controllers/WebScrapingController')} deps.webScrapingController
 * @param {Function} [deps.authGuard] — optional auth middleware, injected at composition root
 * @returns {express.Router}
 */
function createWebScrapingRoutes({ webScrapingController, authGuard }) {
  const router = express.Router();
  const guard = authGuard ?? ((req, res, next) => next()); // no-op if not provided

  /**
   * @route POST /api/scrape/search-urls
   * @desc  Crawl a seed URL and discover all internal URLs
   * @access Private
   */
  router.post('/search-urls', guard, webScrapingController.crawlWebsite);

  /**
   * @route POST /api/scrape/urls
   * @desc  Submit a batch of URLs for content scraping
   * @access Private
   */
  router.post('/urls', guard, webScrapingController.scrapeUrls);

  /**
   * @route GET /api/scrape/result/:jobId
   * @desc  Poll the result of a previously submitted scrape job
   * @access Private
   */
  router.get('/result/:jobId', guard, webScrapingController.getScrapeResultByJobId);

  return router;
}

module.exports = { createWebScrapingRoutes };
