'use strict';

const WebhookModel = require('../models/WebhookModel');

class MongoWebhookRepository {
  async findById(id) {
    return WebhookModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return WebhookModel.find({ organizationId }).sort({ createdAt: -1 }).lean();
  }

  async findEnabled(organizationId) {
    return WebhookModel.find({ organizationId, isEnabled: true }).lean();
  }

  async findByEventType(organizationId, eventType) {
    return WebhookModel.find({ organizationId, eventType, isEnabled: true }).lean();
  }

  async findAll(filters = {}) {
    return WebhookModel.find(filters).sort({ createdAt: -1 }).lean();
  }

  async save(data) {
    return WebhookModel.create(data);
  }

  async update(id, data) {
    return WebhookModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return WebhookModel.findByIdAndDelete(id);
  }

  async logDelivery(id, status, response) {
    return WebhookModel.findByIdAndUpdate(
      id,
      {
        $push: {
          deliveryLogs: { status, response, deliveredAt: new Date() },
        },
      },
      { new: true },
    ).lean();
  }

  async count(filters = {}) {
    return WebhookModel.countDocuments(filters);
  }
}

module.exports = MongoWebhookRepository;
