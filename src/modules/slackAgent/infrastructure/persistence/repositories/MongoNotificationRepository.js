'use strict';

const NotificationModel = require('../models/NotificationModel');

class MongoNotificationRepository {
  async findById(id) {
    return NotificationModel.findById(id).lean();
  }

  async findByUserId(userId) {
    return NotificationModel.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async findByOrganizationId(organizationId) {
    return NotificationModel.find({ organizationId }).sort({ createdAt: -1 }).lean();
  }

  async findUnreadByUserId(userId) {
    return NotificationModel.find({ userId, readAt: null }).sort({ createdAt: -1 }).lean();
  }

  async findByType(organizationId, type) {
    return NotificationModel.find({ organizationId, type }).sort({ createdAt: -1 }).lean();
  }

  async findAll(filters = {}) {
    return NotificationModel.find(filters).sort({ createdAt: -1 }).lean();
  }

  async save(data) {
    return NotificationModel.create(data);
  }

  async markRead(id) {
    return NotificationModel.findByIdAndUpdate(id, { readAt: new Date() }, { new: true }).lean();
  }

  async markAllRead(userId) {
    return NotificationModel.updateMany({ userId, readAt: null }, { readAt: new Date() });
  }

  async delete(id) {
    return NotificationModel.findByIdAndDelete(id);
  }

  async count(filters = {}) {
    return NotificationModel.countDocuments(filters);
  }
}

module.exports = MongoNotificationRepository;
