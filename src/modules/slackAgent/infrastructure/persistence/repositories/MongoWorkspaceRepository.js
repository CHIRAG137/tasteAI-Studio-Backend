'use strict';

const SlackWorkspaceModel = require('../models/SlackWorkspaceModel');

class MongoWorkspaceRepository {
  _addId(doc) {
    if (!doc) return doc;
    if (Array.isArray(doc)) return doc.map(d => ({ ...d, id: d._id?.toString() }));
    return { ...doc, id: doc._id?.toString() };
  }

  async findById(id) {
    const doc = await SlackWorkspaceModel.findById(id).lean();
    return this._addId(doc);
  }

  async findByTeamId(teamId) {
    const doc = await SlackWorkspaceModel.findOne({ teamId }).lean();
    return this._addId(doc);
  }

  async findByOrganizationId(organizationId) {
    const docs = await SlackWorkspaceModel.find({ organizationId }).lean();
    return this._addId(docs);
  }

  async findByUserId(userId) {
    const doc = await SlackWorkspaceModel.findOne({ installedById: userId }).lean();
    return this._addId(doc);
  }

  async findAll(filters = {}) {
    const docs = await SlackWorkspaceModel.find(filters).sort({ createdAt: -1 }).lean();
    return this._addId(docs);
  }

  async save(data) {
    const doc = await SlackWorkspaceModel.create(data);
    return { ...doc.toObject(), id: doc._id.toString() };
  }

  async upsertByTeamId(teamId, data) {
    const doc = await SlackWorkspaceModel.findOneAndUpdate(
      { teamId },
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    ).lean();
    return this._addId(doc);
  }

  async update(id, data) {
    const doc = await SlackWorkspaceModel.findByIdAndUpdate(id, data, { new: true }).lean();
    return this._addId(doc);
  }

  async delete(id) {
    return SlackWorkspaceModel.findByIdAndDelete(id);
  }

  async count(filters = {}) {
    return SlackWorkspaceModel.countDocuments(filters);
  }
}

module.exports = MongoWorkspaceRepository;
