const express = require('express');
const crawlController = require('../controllers/crawlController');

const router = express.Router();

/**
 * @route   POST /api/crawl/search-urls
 * @desc    Crawl a website and discover internal URLs based on the provided seed URL
 * @access  Private (Authenticated user)
 */
router.post('/search-urls', crawlController.crawlWebsite);

/**
 * @route   POST /api/crawl/urls
 * @desc    Scrape and process content from a list of URLs
 * @access  Private (Authenticated user)
 */
router.post('/urls', crawlController.scrapeUrls);

/**
 * @route   GET /api/crawl/result/:jobId
 * @desc    Fetch scraping results for a specific crawl job
 * @access  Private (Authenticated user)
 */
router.get('/result/:jobId', crawlController.getScrapeResultByJobId);

module.exports = router;
