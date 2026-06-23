'use strict';

/**
 * ICrawlJobRepository — abstract repository port for CrawlJob persistence.
 *
 * Use cases depend only on this interface. The concrete MongoDB
 * implementation is injected at the composition root (index.js).
 *
 * @abstract
 */
class ICrawlJobRepository {
  /**
   * @param   {import('../entities/CrawlJob')} crawlJob
   * @returns {Promise<import('../entities/CrawlJob')>}
   */

  async save(crawlJob) {
    throw new Error(`${this.constructor.name} must implement save()`);
  }

  /**
   * @param   {string} id
   * @returns {Promise<import('../entities/CrawlJob') | null>}
   */

  async findById(id) {
    throw new Error(`${this.constructor.name} must implement findById()`);
  }

  /**
   * @param   {string} botId
   * @returns {Promise<import('../entities/CrawlJob')[]>}
   */

  async findByBotId(botId) {
    throw new Error(`${this.constructor.name} must implement findByBotId()`);
  }
}

module.exports = ICrawlJobRepository;
