const express = require("express");
const {
  crawlWebsite,
  scrapeUrls,
  getScrapeResult,
} = require("../controllers/crawlController");

const router = express.Router();

router.post("/search-urls", crawlWebsite);
router.post("/urls", scrapeUrls);
router.get("/result/:jobId", getScrapeResult);

module.exports = router;
