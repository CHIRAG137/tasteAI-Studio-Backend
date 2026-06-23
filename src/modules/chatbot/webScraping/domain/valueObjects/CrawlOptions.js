'use strict';

/**
 * CrawlOptions — immutable value object encapsulating all configuration
 * for a website crawl (URL discovery) request.
 *
 * Validates its own invariants so use cases and services never receive
 * an invalid options object. Constructing one is a guarantee of validity.
 */
class CrawlOptions {
  /**
   * @param {object} props
   * @param {string}  props.url
   * @param {number}  [props.limit=100]
   * @param {boolean} [props.includeSubdomains=true]
   * @param {boolean} [props.ignoreSitemap=true]
   */
  constructor({ url, limit = 100, includeSubdomains = true, ignoreSitemap = true }) {
    if (!url || typeof url !== 'string') {
      throw new Error('CrawlOptions: url is required and must be a string');
    }
    if (!CrawlOptions._isValidUrl(url)) {
      throw new Error(`CrawlOptions: "${url}" is not a valid URL`);
    }
    if (typeof limit !== 'number' || limit < 1 || limit > 1000) {
      throw new Error('CrawlOptions: limit must be a number between 1 and 1000');
    }

    // Freeze to enforce immutability — value objects must not be mutated
    return Object.freeze({
      url,
      limit,
      includeSubdomains: Boolean(includeSubdomains),
      ignoreSitemap: Boolean(ignoreSitemap),
    });
  }

  static _isValidUrl(str) {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = CrawlOptions;
