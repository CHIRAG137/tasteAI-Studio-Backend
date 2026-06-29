'use strict';

const EventModel = require('../models/EventModel');

class MongoEventRepository {
  async findById(id) {
    return EventModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId, filters = {}) {
    const query = { organizationId, ...filters };
    return EventModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async findByType(organizationId, type) {
    return EventModel.find({ organizationId, type }).sort({ createdAt: -1 }).lean();
  }

  async findByResourceId(resourceType, resourceId) {
    return EventModel.find({ resourceType, resourceId }).sort({ createdAt: -1 }).lean();
  }

  async findPending() {
    return EventModel.find({ processedAt: null }).sort({ createdAt: 1 }).lean();
  }

  async findAll(filters = {}) {
    return EventModel.find(filters).sort({ createdAt: -1 }).lean();
  }

  async save(data) {
    return EventModel.create(data);
  }

  async markProcessed(id) {
    return EventModel.findByIdAndUpdate(id, { processedAt: new Date() }, { new: true }).lean();
  }

  async delete(id) {
    return EventModel.findByIdAndDelete(id);
  }

  async count(filters = {}) {
    return EventModel.countDocuments(filters);
  }
}

module.exports = MongoEventRepository;
