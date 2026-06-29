'use strict';

const TeamModel = require('../models/TeamModel');

class MongoTeamRepository {
  async findById(id) {
    return TeamModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return TeamModel.find({ organizationId }).sort({ name: 1 }).lean();
  }

  async findEnabled(organizationId) {
    return TeamModel.find({ organizationId, isEnabled: true }).sort({ name: 1 }).lean();
  }

  async findByDepartmentId(departmentId) {
    return TeamModel.find({ departmentId }).sort({ name: 1 }).lean();
  }

  async findByLeadId(leadId) {
    return TeamModel.find({ leadId }).lean();
  }

  async search(query) {
    const regex = new RegExp(query, 'i');
    return TeamModel.find({ name: regex }).lean();
  }

  async findAll(filters = {}) {
    return TeamModel.find(filters).sort({ name: 1 }).lean();
  }

  async save(data) {
    return TeamModel.create(data);
  }

  async update(id, data) {
    return TeamModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return TeamModel.findByIdAndDelete(id);
  }

  async addMember(teamId, userId) {
    return TeamModel.findByIdAndUpdate(
      teamId,
      { $addToSet: { memberIds: userId } },
      { new: true },
    ).lean();
  }

  async removeMember(teamId, userId) {
    return TeamModel.findByIdAndUpdate(
      teamId,
      { $pull: { memberIds: userId } },
      { new: true },
    ).lean();
  }

  async count(filters = {}) {
    return TeamModel.countDocuments(filters);
  }
}

module.exports = MongoTeamRepository;
