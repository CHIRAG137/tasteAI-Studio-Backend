'use strict';

const axios = require('axios');
const { env } = require('../../../config/env');

const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';

/**
 * FirecrawlClient — thin Axios instance pre-configured for the
 * Firecrawl API.
 *
 * This is infrastructure config only. No business logic lives here.
 * Provider-specific request/response mapping belongs in
 * FirecrawlScraperService, not here.
 */
function createFirecrawlClient() {
  if (!env.FIRECRAWL_API_KEY) {
    throw new Error('[website-scraping] FIRECRAWL_API_KEY is required');
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
      // Normalize provider errors so callers always get a consistent
      // Error shape rather than an Axios-shaped object
      const message = error.response?.data?.message || error.response?.data?.error || error.message;
      const normalized = new Error(`Firecrawl API error: ${message}`);
      normalized.statusCode = error.response?.status;
      normalized.raw = error.response?.data;
      return Promise.reject(normalized);
    },
  );

  return client;
}

module.exports = { createFirecrawlClient };
