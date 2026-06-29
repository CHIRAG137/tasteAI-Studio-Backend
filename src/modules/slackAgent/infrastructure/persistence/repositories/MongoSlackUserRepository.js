'use strict';

const SlackUserModel = require('../models/SlackUserModel');

class MongoSlackUserRepository {
  async findById(id) {
    return SlackUserModel.findById(id).lean();
  }

  async findBySlackUserId(workspaceId, slackUserId) {
    return SlackUserModel.findOne({ workspaceId, slackUserId }).lean();
  }

  async findByWorkspaceId(workspaceId) {
    return SlackUserModel.find({ workspaceId }).sort({ name: 1 }).lean();
  }

  async findByOrganizationId(organizationId) {
    return SlackUserModel.find({ organizationId }).lean();
  }

  async search(query) {
    const regex = new RegExp(query, 'i');
    return SlackUserModel.find({
      $or: [{ name: regex }, { email: regex }, { realName: regex }],
    }).lean();
  }

  async findByEmail(workspaceId, email) {
    return SlackUserModel.findOne({ workspaceId, email }).lean();
  }

  async findAll(filters = {}) {
    return SlackUserModel.find(filters).lean();
  }

  async save(data) {
    return SlackUserModel.create(data);
  }

  async update(id, data) {
    return SlackUserModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async bulkSave(users) {
    const ops = users.map((u) => ({
      updateOne: {
        filter: { workspaceId: u.workspaceId, slackUserId: u.slackUserId },
        update: { $set: { ...u, lastSyncedAt: new Date() } },
        upsert: true,
      },
    }));
    await SlackUserModel.bulkWrite(ops);
    return this.findByWorkspaceId(users[0]?.workspaceId);
  }

  async count(filters = {}) {
    return SlackUserModel.countDocuments(filters);
  }
}

module.exports = MongoSlackUserRepository;
