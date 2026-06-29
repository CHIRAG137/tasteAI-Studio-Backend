'use strict';

const EscalationModel = require('../models/EscalationModel');

class MongoEscalationRepository {
  async findById(id) {
    return EscalationModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return EscalationModel.find({ organizationId }).sort({ level: 1 }).lean();
  }

  async findByLevel(organizationId, level) {
    return EscalationModel.findOne({ organizationId, level }).lean();
  }

  async findEnabled(organizationId) {
    return EscalationModel.find({ organizationId, isEnabled: true }).sort({ level: 1 }).lean();
  }

  async findAll(filters = {}) {
    return EscalationModel.find(filters).sort({ level: 1 }).lean();
  }

  async save(data) {
    return EscalationModel.create(data);
  }

  async update(id, data) {
    return EscalationModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return EscalationModel.findByIdAndDelete(id);
  }

  async count(filters = {}) {
    return EscalationModel.countDocuments(filters);
  }
}

module.exports = MongoEscalationRepository;
