'use strict';

const mongoose = require('mongoose');
const ICrawlJobRepository = require('../../domain/repositories/ICrawlJobRepository');
const CrawlJob = require('../../domain/entities/CrawlJob');

// Schema is defined here, co-located with the repository that owns it.
// No other module imports this schema directly — they go through the
// repository interface (ICrawlJobRepository).
const crawlJobSchema = new mongoose.Schema(
  {
    botId: { type: String, required: true, index: true },
    seedUrl: { type: String, required: true },
    discoveredUrls: { type: [String], default: [] },
    status: {
      type: String,
      enum: Object.values(CrawlJob.STATUS),
      default: CrawlJob.STATUS.PENDING,
    },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    externalJobId: { type: String, default: null },
  },
  { timestamps: true },
);

const CrawlJobModel = mongoose.model('CrawlJob', crawlJobSchema);

/**
 * MongoCrawlJobRepository — implements ICrawlJobRepository using Mongoose.
 *
 * Responsible for mapping between Mongoose documents and domain entities.
 * Nothing outside this class should reference `CrawlJobModel` directly.
 */
class MongoCrawlJobRepository extends ICrawlJobRepository {
  async save(crawlJob) {
    if (!crawlJob.id) {
      // New entity — insert
      const doc = await CrawlJobModel.create({
        botId: crawlJob.botId,
        seedUrl: crawlJob.seedUrl,
        discoveredUrls: crawlJob.discoveredUrls,
        status: crawlJob.status,
        result: crawlJob.result,
        externalJobId: crawlJob.externalJobId,
      });
      return this._toDomain(doc);
    }

    // Existing entity — update
    const doc = await CrawlJobModel.findByIdAndUpdate(
      crawlJob.id,
      {
        discoveredUrls: crawlJob.discoveredUrls,
        status: crawlJob.status,
        result: crawlJob.result,
        externalJobId: crawlJob.externalJobId,
      },
      { new: true },
    );
    if (!doc) {
      throw new Error(`CrawlJob "${crawlJob.id}" not found during save`);
    }
    return this._toDomain(doc);
  }

  async findById(id) {
    const doc = await CrawlJobModel.findById(id).lean();
    return doc ? this._toDomain(doc) : null;
  }

  async findByBotId(botId) {
    const docs = await CrawlJobModel.find({ botId }).lean();
    return docs.map((d) => this._toDomain(d));
  }

  /** @private */
  _toDomain(doc) {
    return new CrawlJob({
      id: doc._id.toString(),
      botId: doc.botId,
      seedUrl: doc.seedUrl,
      discoveredUrls: doc.discoveredUrls,
      status: doc.status,
      result: doc.result,
      externalJobId: doc.externalJobId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}

module.exports = MongoCrawlJobRepository;
