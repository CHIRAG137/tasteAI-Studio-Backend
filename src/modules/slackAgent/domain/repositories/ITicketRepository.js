'use strict';

class ITicketRepository {
  async findById(id) {
    throw new Error('Not implemented');
  }
  async findByOrganizationId(organizationId, filters) {
    throw new Error('Not implemented');
  }
  async findByAssigneeId(assigneeId) {
    throw new Error('Not implemented');
  }
  async findByChannelId(channelId) {
    throw new Error('Not implemented');
  }
  async findByThreadId(threadId) {
    throw new Error('Not implemented');
  }
  async findByStatus(organizationId, status) {
    throw new Error('Not implemented');
  }
  async findByPriority(organizationId, priority) {
    throw new Error('Not implemented');
  }
  async search(query) {
    throw new Error('Not implemented');
  }
  async findSimilar(ticketId, limit) {
    throw new Error('Not implemented');
  }
  async findDuplicates(ticketId) {
    throw new Error('Not implemented');
  }
  async findAll(filters) {
    throw new Error('Not implemented');
  }
  async save(ticket) {
    throw new Error('Not implemented');
  }
  async update(id, data) {
    throw new Error('Not implemented');
  }
  async delete(id) {
    throw new Error('Not implemented');
  }
  async merge(sourceIds, targetId) {
    throw new Error('Not implemented');
  }
  async addComment(ticketId, comment) {
    throw new Error('Not implemented');
  }
  async addAttachment(ticketId, attachment) {
    throw new Error('Not implemented');
  }
  async getTimeline(ticketId) {
    throw new Error('Not implemented');
  }
  async getHistory(ticketId) {
    throw new Error('Not implemented');
  }
  async addWatcher(ticketId, userId) {
    throw new Error('Not implemented');
  }
  async removeWatcher(ticketId, userId) {
    throw new Error('Not implemented');
  }
  async addFollower(ticketId, userId) {
    throw new Error('Not implemented');
  }
  async removeFollower(ticketId, userId) {
    throw new Error('Not implemented');
  }
  async count(filters) {
    throw new Error('Not implemented');
  }
}

module.exports = ITicketRepository;
