'use strict';

class Thread {
  constructor({ id, organizationId, workspaceId, channelId, threadTs, parentMessageTs, topic, participants, messageCount, linkedTicketId, isMonitored, aiSummary, lastActivityAt, lastSyncedAt, createdAt, updatedAt }) {
    this.id = id;
    this.organizationId = organizationId;
    this.workspaceId = workspaceId;
    this.channelId = channelId;
    this.threadTs = threadTs;
    this.parentMessageTs = parentMessageTs;
    this.topic = topic;
    this.participants = participants || [];
    this.messageCount = messageCount || 0;
    this.linkedTicketId = linkedTicketId;
    this.isMonitored = isMonitored || false;
    this.aiSummary = aiSummary;
    this.lastActivityAt = lastActivityAt;
    this.lastSyncedAt = lastSyncedAt;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.workspaceId) throw new Error('Workspace id is required');
    if (!this.channelId) throw new Error('Channel id is required');
    if (!this.threadTs) throw new Error('Thread timestamp is required');
  }
}

module.exports = Thread;
