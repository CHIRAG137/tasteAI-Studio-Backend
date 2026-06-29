'use strict';

const SlackChannelModel = require('../models/SlackChannelModel');

class MongoChannelRepository {
  _addId(doc) {
    if (!doc) {
      return doc;
    }
    if (Array.isArray(doc)) {
      return doc.map((d) => ({ ...d, id: d._id?.toString() }));
    }
    return { ...doc, id: doc._id?.toString() };
  }

  async findById(id) {
    const doc = await SlackChannelModel.findById(id).lean();
    return this._addId(doc);
  }

  async findByChannelId(workspaceId, channelId) {
    const doc = await SlackChannelModel.findOne({ workspaceId, channelId }).lean();
    return this._addId(doc);
  }

  async findByWorkspaceId(workspaceId) {
    const docs = await SlackChannelModel.find({ workspaceId }).sort({ channelName: 1 }).lean();
    return this._addId(docs);
  }

  async findByOrganizationId(organizationId) {
    const docs = await SlackChannelModel.find({ organizationId }).sort({ channelName: 1 }).lean();
    return this._addId(docs);
  }

  async findMonitored(organizationId) {
    const docs = await SlackChannelModel.find({ organizationId, isMonitored: true }).lean();
    return this._addId(docs);
  }

  async search(query) {
    const regex = new RegExp(query, 'i');
    const docs = await SlackChannelModel.find({ channelName: regex }).lean();
    return this._addId(docs);
  }

  async findAll(filters = {}) {
    const docs = await SlackChannelModel.find(filters).lean();
    return this._addId(docs);
  }

  async save(data) {
    const doc = await SlackChannelModel.create(data);
    return { ...doc.toObject(), id: doc._id.toString() };
  }

  async update(id, data) {
    const doc = await SlackChannelModel.findByIdAndUpdate(id, data, { new: true }).lean();
    return this._addId(doc);
  }

  async delete(id) {
    return SlackChannelModel.findByIdAndDelete(id);
  }

  async bulkSave(channels) {
    const ops = channels.map((c) => ({
      updateOne: {
        filter: { workspaceId: c.workspaceId, channelId: c.channelId },
        update: { $set: { ...c, lastSyncedAt: new Date() } },
        upsert: true,
      },
    }));
    await SlackChannelModel.bulkWrite(ops);
    return this.findByWorkspaceId(channels[0]?.workspaceId);
  }

  async count(filters = {}) {
    return SlackChannelModel.countDocuments(filters);
  }
}

module.exports = MongoChannelRepository;
