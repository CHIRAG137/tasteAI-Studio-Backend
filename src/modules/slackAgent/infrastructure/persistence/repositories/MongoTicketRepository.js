'use strict';

const TicketModel = require('../models/TicketModel');

class MongoTicketRepository {
  async findById(id) {
    return TicketModel.findById(id).lean();
  }

  async findByOrganizationId(organizationId, filters = {}) {
    const query = { organizationId, ...filters };
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedToId) query.assignedToId = filters.assignedToId;
    if (filters.category) query.category = filters.category;
    return TicketModel.find(query).sort({ createdAt: -1 }).lean();
  }

  async findByAssigneeId(assigneeId) {
    return TicketModel.find({ assignedToId: assigneeId }).sort({ createdAt: -1 }).lean();
  }

  async findByChannelId(channelId) {
    return TicketModel.find({ channelId }).lean();
  }

  async findByThreadId(threadId) {
    return TicketModel.findOne({ threadId }).lean();
  }

  async findByStatus(organizationId, status) {
    return TicketModel.find({ organizationId, status }).lean();
  }

  async findByPriority(organizationId, priority) {
    return TicketModel.find({ organizationId, priority }).lean();
  }

  async search(query) {
    const regex = new RegExp(query, 'i');
    return TicketModel.find({
      $or: [
        { title: regex },
        { description: regex },
        { tags: regex },
      ],
    }).sort({ createdAt: -1 }).lean();
  }

  async findAll(filters = {}) {
    return TicketModel.find(filters).sort({ createdAt: -1 }).lean();
  }

  async save(data) {
    return TicketModel.create(data);
  }

  async update(id, data) {
    return TicketModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
  }

  async delete(id) {
    return TicketModel.findByIdAndDelete(id);
  }

  async merge(sourceIds, targetId) {
    await TicketModel.updateMany(
      { _id: { $in: sourceIds } },
      { $set: { status: 'merged', mergedIntoId: targetId } },
    );
    await TicketModel.findByIdAndUpdate(targetId, {
      $set: { status: 'open' },
      $addToSet: { mergedTicketIds: { $each: sourceIds } },
    });
    return this.findById(targetId);
  }

  async addComment(ticketId, comment) {
    return TicketModel.findByIdAndUpdate(
      ticketId,
      { $push: { comments: comment } },
      { new: true },
    ).lean();
  }

  async addAttachment(ticketId, attachment) {
    return TicketModel.findByIdAndUpdate(
      ticketId,
      { $push: { attachments: attachment } },
      { new: true },
    ).lean();
  }

  async addWatcher(ticketId, userId) {
    return TicketModel.findByIdAndUpdate(
      ticketId,
      { $addToSet: { watcherIds: userId } },
      { new: true },
    ).lean();
  }

  async removeWatcher(ticketId, userId) {
    return TicketModel.findByIdAndUpdate(
      ticketId,
      { $pull: { watcherIds: userId } },
      { new: true },
    ).lean();
  }

  async addFollower(ticketId, userId) {
    return TicketModel.findByIdAndUpdate(
      ticketId,
      { $addToSet: { followerIds: userId } },
      { new: true },
    ).lean();
  }

  async removeFollower(ticketId, userId) {
    return TicketModel.findByIdAndUpdate(
      ticketId,
      { $pull: { followerIds: userId } },
      { new: true },
    ).lean();
  }

  async count(filters = {}) {
    return TicketModel.countDocuments(filters);
  }
}

module.exports = MongoTicketRepository;
