'use strict';

const SkillModel = require('../models/SkillModel');

class MongoSkillRepository {
  async findById(id) {
    return SkillModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return SkillModel.find({ organizationId }).sort({ name: 1 }).lean();
  }

  async findEnabled(organizationId) {
    return SkillModel.find({ organizationId, isEnabled: true }).sort({ name: 1 }).lean();
  }

  async findByCategory(organizationId, category) {
    return SkillModel.find({ organizationId, category }).sort({ name: 1 }).lean();
  }

  async search(query) {
    const regex = new RegExp(query, 'i');
    return SkillModel.find({ name: regex }).lean();
  }

  async findAll(filters = {}) {
    return SkillModel.find(filters).sort({ name: 1 }).lean();
  }

  async save(data) {
    return SkillModel.create(data);
  }

  async update(id, data) {
    return SkillModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return SkillModel.findByIdAndDelete(id);
  }

  async assignToAgent(skillId, agentId) {
    return SkillModel.findByIdAndUpdate(
      skillId,
      { $addToSet: { assignedAgentIds: agentId } },
      { new: true },
    ).lean();
  }

  async unassignFromAgent(skillId, agentId) {
    return SkillModel.findByIdAndUpdate(
      skillId,
      { $pull: { assignedAgentIds: agentId } },
      { new: true },
    ).lean();
  }

  async count(filters = {}) {
    return SkillModel.countDocuments(filters);
  }
}

module.exports = MongoSkillRepository;
