const logger = require('../../utils/logger');
const firecrawlClient = require('../configs/firecrawlClient');

// crawl website and extract su-urls
exports.crawlWebsite = async ({
  url,
  limit = 100,
  includeSubdomains = true,
  ignoreSitemap = true,
}) => {
  try {
    if (!url) {
      logger.error('Crawl website failed: URL missing');
      throw new Error('URL is required');
    }

    logger.info('Starting crawlWebsite request', {
      url,
      limit,
      includeSubdomains,
      ignoreSitemap,
    });

    const response = await firecrawlClient.post('/map', {
      url,
      limit,
      includeSubdomains,
      ignoreSitemap,
    });

    logger.info('CrawlWebsite completed successfully', {
      url,
      count: response.data?.results?.length,
    });

    return response.data;
  } catch (error) {
    logger.error('Error in crawlWebsite', {
      url,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// scrape multiple urls
exports.scrapeUrls = async ({ urls, formats = ['markdown', 'html'] }) => {
  try {
    if (!Array.isArray(urls) || urls.length === 0) {
      logger.error('Scrape URLs failed: Invalid or empty array');
      throw new Error('A non-empty array of URLs is required');
    }

    logger.info('Starting scrapeUrls request', {
      urlsCount: urls.length,
      formats,
    });

    const response = await firecrawlClient.post('/batch/scrape', {
      urls,
      formats,
    });

    logger.info('ScrapeUrls request submitted successfully', {
      jobId: response.data?.jobId,
    });

    return response.data;
  } catch (error) {
    logger.error('Error in scrapeUrls', {
      urlsCount: urls?.length,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// get scrape result by job ID
exports.getScrapeResultByJobId = async (jobId) => {
  try {
    if (!jobId) {
      logger.error('Get scrape result failed: Job ID missing');
      throw new Error('Job ID is required');
    }

    logger.info('Fetching scrape result', { jobId });

    const response = await firecrawlClient.get(`/batch/scrape/${jobId}`);

    const { status, data } = response.data;
    logger.info('Scrape result received', { jobId, status });

    if (status === 'in_progress' || status === 'scraping') {
      return {
        statusCode: 202,
        response: { message: 'Job is still in progress' },
      };
    }

    if (status === 'completed') {
      return {
        statusCode: 200,
        response: { message: 'Job completed.', data },
      };
    }

    logger.warn('Unexpected job status received', { jobId, status });
    return {
      statusCode: 500,
      response: { error: 'Unexpected job status', status },
    };
  } catch (error) {
    logger.error('Error in getScrapeResultByJobId', {
      jobId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};
