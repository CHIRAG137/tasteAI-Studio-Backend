'use strict';

class SlackChannel {
  constructor({
    id,
    workspaceId,
    organizationId,
    channelId,
    channelName,
    channelTopic,
    channelPurpose,
    isMember,
    isPrivate,
    isArchived,
    isMonitored,
    memberCount,
    permissions,
    configuration,
    lastSyncedAt,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.workspaceId = workspaceId;
    this.organizationId = organizationId;
    this.channelId = channelId;
    this.channelName = channelName;
    this.channelTopic = channelTopic;
    this.channelPurpose = channelPurpose;
    this.isMember = isMember || false;
    this.isPrivate = isPrivate || false;
    this.isArchived = isArchived || false;
    this.isMonitored = isMonitored || false;
    this.memberCount = memberCount || 0;
    this.permissions = permissions || [];
    this.configuration = configuration || {};
    this.lastSyncedAt = lastSyncedAt;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.workspaceId) {
      throw new Error('Workspace id is required');
    }
    if (!this.channelId) {
      throw new Error('Slack channel id is required');
    }
    if (!this.channelName) {
      throw new Error('Channel name is required');
    }
  }
}

module.exports = SlackChannel;
