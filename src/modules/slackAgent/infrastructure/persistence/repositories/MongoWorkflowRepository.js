'use strict';

const WorkflowModel = require('../models/WorkflowModel');

class MongoWorkflowRepository {
  async findById(id) {
    return WorkflowModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return WorkflowModel.find({ organizationId }).sort({ createdAt: -1 }).lean();
  }

  async findEnabled(organizationId) {
    return WorkflowModel.find({ organizationId, isEnabled: true }).lean();
  }

  async findByTrigger(organizationId, trigger) {
    return WorkflowModel.find({ organizationId, trigger, isEnabled: true }).lean();
  }

  async findAll(filters = {}) {
    return WorkflowModel.find(filters).sort({ createdAt: -1 }).lean();
  }

  async save(data) {
    return WorkflowModel.create(data);
  }

  async update(id, data) {
    return WorkflowModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return WorkflowModel.findByIdAndDelete(id);
  }

  async clone(id, overrides = {}) {
    const source = await WorkflowModel.findById(id).lean();
    if (!source) return null;
    delete source._id;
    delete source.__v;
    delete source.createdAt;
    delete source.updatedAt;
    return WorkflowModel.create({ ...source, ...overrides });
  }

  async count(filters = {}) {
    return WorkflowModel.countDocuments(filters);
  }
}

module.exports = MongoWorkflowRepository;
