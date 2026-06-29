'use strict';

const HolidayModel = require('../models/HolidayModel');

class MongoHolidayRepository {
  async findById(id) {
    return HolidayModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId) {
    return HolidayModel.find({ organizationId }).sort({ date: 1 }).lean();
  }

  async findUpcoming(organizationId) {
    return HolidayModel.find({ organizationId, date: { $gte: new Date() } })
      .sort({ date: 1 })
      .lean();
  }

  async findByDateRange(organizationId, startDate, endDate) {
    return HolidayModel.find({
      organizationId,
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: 1 })
      .lean();
  }

  async findByDate(organizationId, date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return HolidayModel.findOne({ organizationId, date: { $gte: start, $lte: end } }).lean();
  }

  async findAll(filters = {}) {
    return HolidayModel.find(filters).sort({ date: 1 }).lean();
  }

  async save(data) {
    return HolidayModel.create(data);
  }

  async update(id, data) {
    return HolidayModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async delete(id) {
    return HolidayModel.findByIdAndDelete(id);
  }

  async isHoliday(organizationId, date) {
    const holiday = await this.findByDate(organizationId, date);
    return !!holiday;
  }

  async count(filters = {}) {
    return HolidayModel.countDocuments(filters);
  }
}

module.exports = MongoHolidayRepository;
