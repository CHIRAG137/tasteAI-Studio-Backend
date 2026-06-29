'use strict';

class SyncChannelsCommand {
  constructor({ workspaceId, organizationId }) {
    this.workspaceId = workspaceId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.workspaceId) throw new Error('Workspace id is required');
  }
}

class AddMonitoredChannelCommand {
  constructor({ channelId, organizationId }) {
    this.channelId = channelId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.channelId) throw new Error('Channel id is required');
  }
}

class RemoveMonitoredChannelCommand {
  constructor({ channelId, organizationId }) {
    this.channelId = channelId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.channelId) throw new Error('Channel id is required');
  }
}

class UpdateChannelPermissionsCommand {
  constructor({ channelId, permissions, organizationId }) {
    this.channelId = channelId;
    this.permissions = permissions;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.channelId) throw new Error('Channel id is required');
    if (!this.permissions) throw new Error('Permissions are required');
  }
}

class UpdateChannelConfigCommand {
  constructor({ channelId, configuration, organizationId }) {
    this.channelId = channelId;
    this.configuration = configuration;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.channelId) throw new Error('Channel id is required');
    if (!this.configuration) throw new Error('Configuration is required');
  }
}

module.exports = { SyncChannelsCommand, AddMonitoredChannelCommand, RemoveMonitoredChannelCommand, UpdateChannelPermissionsCommand, UpdateChannelConfigCommand };
