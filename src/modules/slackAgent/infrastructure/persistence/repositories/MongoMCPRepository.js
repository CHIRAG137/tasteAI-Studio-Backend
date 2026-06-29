'use strict';

const MCPConnectionModel = require('../models/MCPConnectionModel');

class MongoMCPRepository {
  async findById(id) {
    return MCPConnectionModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return MCPConnectionModel.find({ organizationId }).sort({ name: 1 }).lean();
  }

  async findEnabled(organizationId) {
    return MCPConnectionModel.find({ organizationId, isEnabled: true }).lean();
  }

  async findByType(organizationId, type) {
    return MCPConnectionModel.find({ organizationId, type }).lean();
  }

  async findAll(filters = {}) {
    return MCPConnectionModel.find(filters).sort({ name: 1 }).lean();
  }

  async save(data) {
    return MCPConnectionModel.create(data);
  }

  async update(id, data) {
    return MCPConnectionModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return MCPConnectionModel.findByIdAndDelete(id);
  }

  async testConnection(id) {
    const connection = await this.findById(id);
    if (!connection) return null;
    return { status: 'unknown', latency: 0 };
  }

  async count(filters = {}) {
    return MCPConnectionModel.countDocuments(filters);
  }
}

module.exports = MongoMCPRepository;
