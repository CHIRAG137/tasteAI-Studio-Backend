'use strict';

const AgentModel = require('../models/AgentModel');

class MongoAgentRepository {
  _addId(doc) {
    if (!doc) {
      return doc;
    }
    if (Array.isArray(doc)) {
      return doc.map((d) => ({
        ...d,
        id: d._id?.toString(),
        assignedChannels: d.assignedChannelIds,
      }));
    }
    return { ...doc, id: doc._id?.toString(), assignedChannels: doc.assignedChannelIds };
  }

  async findById(id) {
    const doc = await AgentModel.findById(id).lean();
    return this._addId(doc);
  }

  async findByOrganizationId(organizationId) {
    const docs = await AgentModel.find({ organizationId }).sort({ createdAt: -1 }).lean();
    return this._addId(docs);
  }

  async findByChannelId(channelId) {
    const docs = await AgentModel.find({ assignedChannelIds: channelId }).lean();
    return this._addId(docs);
  }

  async findEnabled(organizationId) {
    const docs = await AgentModel.find({ organizationId, isEnabled: true }).lean();
    return this._addId(docs);
  }

  async search(query) {
    const regex = new RegExp(query, 'i');
    const docs = await AgentModel.find({ name: regex }).lean();
    return this._addId(docs);
  }

  async findAll(filters = {}) {
    const docs = await AgentModel.find(filters).lean();
    return this._addId(docs);
  }

  async save(data) {
    const doc = await AgentModel.create(data);
    return { ...doc.toObject(), id: doc._id.toString() };
  }

  async update(id, data) {
    const doc = await AgentModel.findByIdAndUpdate(id, data, { new: true }).lean();
    return this._addId(doc);
  }

  async delete(id) {
    return AgentModel.findByIdAndDelete(id);
  }

  async clone(id, overrides = {}) {
    const source = await AgentModel.findById(id).lean();
    if (!source) {
      return null;
    }
    delete source._id;
    delete source.__v;
    delete source.createdAt;
    delete source.updatedAt;
    const doc = await AgentModel.create({ ...source, ...overrides });
    return { ...doc.toObject(), id: doc._id.toString() };
  }

  async count(filters = {}) {
    return AgentModel.countDocuments(filters);
  }
}

module.exports = MongoAgentRepository;
