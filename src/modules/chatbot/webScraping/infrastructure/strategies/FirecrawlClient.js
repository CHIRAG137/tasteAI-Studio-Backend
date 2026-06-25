'use strict';

const axios = require('axios');
const { env } = require('../../../../../config/env');
const logger = require('../../../../shared/logging');

const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';

function createFirecrawlClient() {
  if (!env.FIRECRAWL_API_KEY) {
    throw new Error('[webScraping] FIRECRAWL_API_KEY is required');
  }

  const client = axios.create({
    baseURL: FIRECRAWL_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
    },
    timeout: 30_000,
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.response?.data?.error || error.message;
      logger.error('Firecrawl API request failed', { status, message });
      const normalized = new Error(`Firecrawl API error: ${message}`);
      normalized.statusCode = status;
      normalized.raw = error.response?.data;
      return Promise.reject(normalized);
    },
  );

  return client;
}

module.exports = { createFirecrawlClient };
