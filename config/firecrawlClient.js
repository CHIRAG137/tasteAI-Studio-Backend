const axios = require('axios');
const logger = require('../utils/logger');

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';

if (!FIRECRAWL_API_KEY) {
  throw new Error('FIRECRAWL_API_KEY is not defined');
}

const firecrawlClient = axios.create({
  baseURL: FIRECRAWL_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
  },
  timeout: 30000,
});

firecrawlClient.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.error('Firecrawl API error', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

module.exports = firecrawlClient;
