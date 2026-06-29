'use strict';

const TagModel = require('../models/TagModel');

class MongoTagRepository {
  async findById(id) {
    return TagModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return TagModel.find({ organizationId }).sort({ name: 1 }).lean();
  }

  async findEnabled(organizationId) {
    return TagModel.find({ organizationId, isEnabled: true }).sort({ name: 1 }).lean();
  }

  async search(query) {
    const regex = new RegExp(query, 'i');
    return TagModel.find({ name: regex }).lean();
  }

  async findAll(filters = {}) {
    return TagModel.find(filters).sort({ name: 1 }).lean();
  }

  async save(data) {
    return TagModel.create(data);
  }

  async update(id, data) {
    return TagModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return TagModel.findByIdAndDelete(id);
  }

  async count(filters = {}) {
    return TagModel.countDocuments(filters);
  }
}

module.exports = MongoTagRepository;
