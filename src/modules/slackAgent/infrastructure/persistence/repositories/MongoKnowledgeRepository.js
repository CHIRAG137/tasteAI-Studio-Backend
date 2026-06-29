'use strict';

const KnowledgeModel = require('../models/KnowledgeModel');

class MongoKnowledgeRepository {
  async findById(id) {
    return KnowledgeModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return KnowledgeModel.find({ organizationId }).sort({ title: 1 }).lean();
  }

  async findByCategory(organizationId, category) {
    return KnowledgeModel.find({ organizationId, category }).sort({ title: 1 }).lean();
  }

  async search(query) {
    const regex = new RegExp(query, 'i');
    return KnowledgeModel.find({
      $or: [{ title: regex }, { content: regex }, { tags: regex }],
    }).lean();
  }

  async findPublished(organizationId) {
    return KnowledgeModel.find({ organizationId, status: 'published' }).sort({ title: 1 }).lean();
  }

  async findAll(filters = {}) {
    return KnowledgeModel.find(filters).sort({ title: 1 }).lean();
  }

  async save(data) {
    return KnowledgeModel.create(data);
  }

  async update(id, data) {
    return KnowledgeModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return KnowledgeModel.findByIdAndDelete(id);
  }

  async addView(id) {
    return KnowledgeModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true }).lean();
  }

  async upvote(id, userId) {
    return KnowledgeModel.findByIdAndUpdate(
      id,
      { $addToSet: { upvotedBy: userId } },
      { new: true },
    ).lean();
  }

  async count(filters = {}) {
    return KnowledgeModel.countDocuments(filters);
  }
}

module.exports = MongoKnowledgeRepository;
