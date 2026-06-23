'use strict';

const SUPPORTED_FORMATS = Object.freeze(['markdown', 'html', 'rawHtml', 'screenshot', 'links']);

/**
 * ScrapeOptions — immutable value object encapsulating all configuration
 * for a batch URL scrape request.
 */
class ScrapeOptions {
  /**
   * @param {object}   props
   * @param {string[]} props.urls
   * @param {string[]} [props.formats=['markdown','html']]
   */
  constructor({ urls, formats = ['markdown', 'html'] }) {
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new Error('ScrapeOptions: urls must be a non-empty array');
    }
    const invalidUrls = urls.filter((u) => !ScrapeOptions._isValidUrl(u));
    if (invalidUrls.length > 0) {
      throw new Error(`ScrapeOptions: invalid URLs provided: ${invalidUrls.join(', ')}`);
    }
    const invalidFormats = formats.filter((f) => !SUPPORTED_FORMATS.includes(f));
    if (invalidFormats.length > 0) {
      throw new Error(
        `ScrapeOptions: unsupported formats: ${invalidFormats.join(', ')}. ` +
          `Supported: ${SUPPORTED_FORMATS.join(', ')}`,
      );
    }

    return Object.freeze({ urls: [...urls], formats: [...formats] });
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

module.exports = ScrapeOptions;
