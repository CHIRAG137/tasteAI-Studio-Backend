'use strict';

const express = require('express');
const asyncHandler = require('../../../../shared/middleware/asyncHandler');

function createWebScrapingRoutes({ webScrapingController, authGuard }) {
  const router = express.Router();
  const guard = authGuard ?? ((req, res, next) => next());

  router.post('/search-urls', guard, asyncHandler(webScrapingController.crawlWebsite));
  router.post('/urls', guard, asyncHandler(webScrapingController.scrapeUrls));
  router.get('/result/:jobId', guard, asyncHandler(webScrapingController.getScrapeResultByJobId));

  return router;
}

module.exports = { createWebScrapingRoutes };
