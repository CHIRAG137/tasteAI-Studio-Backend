'use strict';

const DepartmentModel = require('../models/DepartmentModel');

class MongoDepartmentRepository {
  async findById(id) {
    return DepartmentModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return DepartmentModel.find({ organizationId }).sort({ name: 1 }).lean();
  }

  async findEnabled(organizationId) {
    return DepartmentModel.find({ organizationId, isEnabled: true }).sort({ name: 1 }).lean();
  }

  async search(query) {
    const regex = new RegExp(query, 'i');
    return DepartmentModel.find({ name: regex }).lean();
  }

  async findAll(filters = {}) {
    return DepartmentModel.find(filters).sort({ name: 1 }).lean();
  }

  async save(data) {
    return DepartmentModel.create(data);
  }

  async update(id, data) {
    return DepartmentModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return DepartmentModel.findByIdAndDelete(id);
  }

  async addMember(departmentId, userId) {
    return DepartmentModel.findByIdAndUpdate(
      departmentId,
      { $addToSet: { memberIds: userId } },
      { new: true },
    ).lean();
  }

  async removeMember(departmentId, userId) {
    return DepartmentModel.findByIdAndUpdate(
      departmentId,
      { $pull: { memberIds: userId } },
      { new: true },
    ).lean();
  }

  async count(filters = {}) {
    return DepartmentModel.countDocuments(filters);
  }
}

module.exports = MongoDepartmentRepository;
