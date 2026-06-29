'use strict';

const CategoryModel = require('../models/CategoryModel');

class MongoCategoryRepository {
  async findById(id) {
    return CategoryModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return CategoryModel.find({ organizationId }).sort({ name: 1 }).lean();
  }

  async findEnabled(organizationId) {
    return CategoryModel.find({ organizationId, isEnabled: true }).sort({ name: 1 }).lean();
  }

  async findByParentId(parentId) {
    return CategoryModel.find({ parentId }).sort({ name: 1 }).lean();
  }

  async findRoot(organizationId) {
    return CategoryModel.find({ organizationId, parentId: null }).sort({ name: 1 }).lean();
  }

  async search(query) {
    const regex = new RegExp(query, 'i');
    return CategoryModel.find({ name: regex }).lean();
  }

  async findAll(filters = {}) {
    return CategoryModel.find(filters).sort({ name: 1 }).lean();
  }

  async save(data) {
    return CategoryModel.create(data);
  }

  async update(id, data) {
    return CategoryModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return CategoryModel.findByIdAndDelete(id);
  }

  async count(filters = {}) {
    return CategoryModel.countDocuments(filters);
  }
}

module.exports = MongoCategoryRepository;
