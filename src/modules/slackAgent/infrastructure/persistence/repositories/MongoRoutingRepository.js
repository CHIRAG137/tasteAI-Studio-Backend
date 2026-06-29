'use strict';

const RoutingRuleModel = require('../models/RoutingRuleModel');

class MongoRoutingRepository {
  async findById(id) {
    return RoutingRuleModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return RoutingRuleModel.find({ organizationId }).sort({ priority: 1 }).lean();
  }

  async findEnabled(organizationId) {
    return RoutingRuleModel.find({ organizationId, isEnabled: true }).sort({ priority: 1 }).lean();
  }

  async findByCategory(organizationId, category) {
    return RoutingRuleModel.find({ organizationId, category, isEnabled: true }).lean();
  }

  async findAll(filters = {}) {
    return RoutingRuleModel.find(filters).sort({ priority: 1 }).lean();
  }

  async save(data) {
    return RoutingRuleModel.create(data);
  }

  async update(id, data) {
    return RoutingRuleModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return RoutingRuleModel.findByIdAndDelete(id);
  }

  async count(filters = {}) {
    return RoutingRuleModel.countDocuments(filters);
  }
}

module.exports = MongoRoutingRepository;
