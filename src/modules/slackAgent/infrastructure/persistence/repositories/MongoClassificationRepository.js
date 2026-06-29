'use strict';

const ClassificationModel = require('../models/ClassificationModel');

class MongoClassificationRepository {
  async findById(id) {
    return ClassificationModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return ClassificationModel.find({ organizationId }).sort({ name: 1 }).lean();
  }

  async findByType(organizationId, type) {
    return ClassificationModel.find({ organizationId, type }).sort({ name: 1 }).lean();
  }

  async findEnabled(organizationId) {
    return ClassificationModel.find({ organizationId, isEnabled: true }).lean();
  }

  async search(query) {
    const regex = new RegExp(query, 'i');
    return ClassificationModel.find({ name: regex }).lean();
  }

  async findAll(filters = {}) {
    return ClassificationModel.find(filters).sort({ name: 1 }).lean();
  }

  async save(data) {
    return ClassificationModel.create(data);
  }

  async update(id, data) {
    return ClassificationModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return ClassificationModel.findByIdAndDelete(id);
  }

  async count(filters = {}) {
    return ClassificationModel.countDocuments(filters);
  }
}

module.exports = MongoClassificationRepository;
