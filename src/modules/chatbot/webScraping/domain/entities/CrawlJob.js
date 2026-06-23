'use strict';

/**
 * CrawlJob — domain entity representing a single website crawl job.
 *
 * Owns its own status transitions and exposes no Mongoose or
 * persistence concern. Any layer that needs to persist this entity
 * does so through the ICrawlJobRepository port.
 */
class CrawlJob {
  static STATUS = Object.freeze({
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
  });

  /**
   * @param {object} props
   * @param {string}   props.id
   * @param {string}   props.botId         — the bot this crawl belongs to
   * @param {string}   props.seedUrl       — the URL the crawl started from
   * @param {string[]} props.discoveredUrls — URLs found during the crawl map step
   * @param {string}   props.status        — one of CrawlJob.STATUS
   * @param {object}   [props.result]      — populated once the job completes
   * @param {string}   [props.externalJobId] — provider job ID (e.g. Firecrawl batch id)
   * @param {Date}     [props.createdAt]
   * @param {Date}     [props.updatedAt]
   */
  constructor({
    id,
    botId,
    seedUrl,
    discoveredUrls = [],
    status = CrawlJob.STATUS.PENDING,
    result = null,
    externalJobId = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id;
    this.botId = botId;
    this.seedUrl = seedUrl;
    this.discoveredUrls = discoveredUrls;
    this.status = status;
    this.result = result;
    this.externalJobId = externalJobId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  markInProgress(externalJobId) {
    this._assertTransitionAllowed(CrawlJob.STATUS.IN_PROGRESS);
    this.status = CrawlJob.STATUS.IN_PROGRESS;
    this.externalJobId = externalJobId;
    this.updatedAt = new Date();
    return this;
  }

  markCompleted(result) {
    this._assertTransitionAllowed(CrawlJob.STATUS.COMPLETED);
    this.status = CrawlJob.STATUS.COMPLETED;
    this.result = result;
    this.updatedAt = new Date();
    return this;
  }

  markFailed() {
    this.status = CrawlJob.STATUS.FAILED;
    this.updatedAt = new Date();
    return this;
  }

  isCompleted() {
    return this.status === CrawlJob.STATUS.COMPLETED;
  }
  isInProgress() {
    return this.status === CrawlJob.STATUS.IN_PROGRESS;
  }
  isPending() {
    return this.status === CrawlJob.STATUS.PENDING;
  }

  _assertTransitionAllowed(targetStatus) {
    if (this.status === CrawlJob.STATUS.COMPLETED || this.status === CrawlJob.STATUS.FAILED) {
      throw new Error(
        `Cannot transition CrawlJob from "${this.status}" to "${targetStatus}" — job is terminal.`,
      );
    }
  }
}

module.exports = CrawlJob;
