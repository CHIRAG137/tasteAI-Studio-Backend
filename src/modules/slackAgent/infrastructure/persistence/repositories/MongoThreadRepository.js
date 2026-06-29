'use strict';

const ThreadModel = require('../models/ThreadModel');

class MongoThreadRepository {
  async findById(id) {
    return ThreadModel.findById(id).lean();
  }

  async findByChannelId(channelId) {
    return ThreadModel.find({ channelId }).sort({ createdAt: -1 }).lean();
  }

  async findByChannelAndThreadTs(channelId, threadTs) {
    return ThreadModel.findOne({ channelId, threadTs }).lean();
  }

  async findByOrganizationId(organizationId) {
    return ThreadModel.find({ organizationId }).sort({ createdAt: -1 }).lean();
  }

  async findActive(organizationId) {
    return ThreadModel.find({ organizationId, status: 'active' }).sort({ updatedAt: -1 }).lean();
  }

  async findAll(filters = {}) {
    return ThreadModel.find(filters).sort({ createdAt: -1 }).lean();
  }

  async save(data) {
    return ThreadModel.create(data);
  }

  async update(id, data) {
    return ThreadModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return ThreadModel.findByIdAndDelete(id);
  }

  async addReply(threadId, reply) {
    return ThreadModel.findByIdAndUpdate(
      threadId,
      { $push: { replies: reply }, $set: { lastReplyAt: new Date() } },
      { new: true },
    ).lean();
  }

  async count(filters = {}) {
    return ThreadModel.countDocuments(filters);
  }
}

module.exports = MongoThreadRepository;
