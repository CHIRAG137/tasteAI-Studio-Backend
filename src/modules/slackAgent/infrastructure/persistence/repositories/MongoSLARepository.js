'use strict';

const SLAModel = require('../models/SLAModel');

class MongoSLARepository {
  async findById(id) {
    return SLAModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return SLAModel.find({ organizationId }).sort({ priority: 1 }).lean();
  }

  async findByPriority(organizationId, priority) {
    return SLAModel.findOne({ organizationId, priority }).lean();
  }

  async findEnabled(organizationId) {
    return SLAModel.find({ organizationId, isEnabled: true }).lean();
  }

  async findAll(filters = {}) {
    return SLAModel.find(filters).sort({ priority: 1 }).lean();
  }

  async save(data) {
    return SLAModel.create(data);
  }

  async update(id, data) {
    return SLAModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return SLAModel.findByIdAndDelete(id);
  }

  async checkOverdue(ticketPriority) {
    const sla = await this.findByPriority(null, ticketPriority);
    if (!sla) return null;
    const deadline = new Date(Date.now() - sla.responseTimeMinutes * 60000);
    return { sla, deadline };
  }

  async count(filters = {}) {
    return SLAModel.countDocuments(filters);
  }
}

module.exports = MongoSLARepository;
