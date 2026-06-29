'use strict';

class IThreadRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findByThreadTs(workspaceId, channelId, threadTs) { throw new Error('Not implemented'); }
  async findByChannelId(channelId) { throw new Error('Not implemented'); }
  async findByWorkspaceId(workspaceId) { throw new Error('Not implemented'); }
  async findByOrganizationId(organizationId) { throw new Error('Not implemented'); }
  async findByTicketId(ticketId) { throw new Error('Not implemented'); }
  async findMonitored(organizationId) { throw new Error('Not implemented'); }
  async findParticipants(threadId) { throw new Error('Not implemented'); }
  async search(query) { throw new Error('Not implemented'); }
  async findAll(filters) { throw new Error('Not implemented'); }
  async save(thread) { throw new Error('Not implemented'); }
  async update(id, data) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
  async count(filters) { throw new Error('Not implemented'); }
}

module.exports = IThreadRepository;
