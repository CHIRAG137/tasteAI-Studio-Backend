'use strict';

const BusinessHoursModel = require('../models/BusinessHoursModel');

class MongoBusinessHoursRepository {
  async findById(id) {
    return BusinessHoursModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return BusinessHoursModel.find({ organizationId }).lean();
  }

  async findEnabled(organizationId) {
    return BusinessHoursModel.find({ organizationId, isEnabled: true }).lean();
  }

  async findByDayOfWeek(organizationId, dayOfWeek) {
    return BusinessHoursModel.findOne({ organizationId, dayOfWeek }).lean();
  }

  async findAll(filters = {}) {
    return BusinessHoursModel.find(filters).lean();
  }

  async save(data) {
    return BusinessHoursModel.create(data);
  }

  async update(id, data) {
    return BusinessHoursModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return BusinessHoursModel.findByIdAndDelete(id);
  }

  async isBusinessHour(organizationId) {
    const now = new Date();
    const day = now.getDay();
    const hours = await this.findByDayOfWeek(organizationId, day);
    if (!hours || !hours.isEnabled) {
      return false;
    }
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = hours.startTime.split(':').map(Number);
    const [endH, endM] = hours.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  async count(filters = {}) {
    return BusinessHoursModel.countDocuments(filters);
  }
}

module.exports = MongoBusinessHoursRepository;
