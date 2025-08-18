const axios = require("axios");

exports.crawlWebsite = async (req, res) => {
  const {
    url,
    limit = 100,
    includeSubdomains = true,
    ignoreSitemap = true,
  } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const response = await axios.post(
      "https://api.firecrawl.dev/v1/map",
      {
        url,
        limit,
        includeSubdomains,
        ignoreSitemap,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Firecrawl API Error:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to crawl website" });
  }
};

exports.scrapeUrls = async (req, res) => {
  const { urls, formats = ["markdown", "html"] } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res
      .status(400)
      .json({ error: "A non-empty array of URLs is required." });
  }

  try {
    const response = await axios.post(
      "https://api.firecrawl.dev/v1/batch/scrape",
      {
        urls,
        formats,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Firecrawl Batch Scrape Error:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to scrape batch URLs" });
  }
};

exports.getScrapeResult = async (req, res) => {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({ error: "Job ID is required in the URL." });
  }

  try {
    const response = await axios.get(
      `https://api.firecrawl.dev/v1/batch/scrape/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        },
      }
    );

    const { status, data } = response.data;

    // You can customize this further
    if (status === "in_progress") {
      return res.status(202).json({ message: "Job is still in progress." });
    }

    if (status === "completed") {
      return res.status(200).json({ message: "Job completed.", data: data });
    }

    return res.status(500).json({ error: "Unexpected job status.", status });
  } catch (error) {
    console.error(
      "Get Firecrawl Job Result Error:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch job result." });
  }
};
