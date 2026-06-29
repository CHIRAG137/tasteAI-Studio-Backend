'use strict';

class InstallWorkspaceCommand {
  constructor({ organizationId, userId, authCode, redirectUri }) {
    this.organizationId = organizationId;
    this.userId = userId;
    this.authCode = authCode;
    this.redirectUri = redirectUri;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) {
      throw new Error('Organization id is required');
    }
    if (!this.authCode) {
      throw new Error('Auth code is required');
    }
    if (!this.redirectUri) {
      throw new Error('Redirect URI is required');
    }
  }
}

class SyncWorkspaceCommand {
  constructor({ organizationId, workspaceId }) {
    this.organizationId = organizationId;
    this.workspaceId = workspaceId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) {
      throw new Error('Organization id is required');
    }
    if (!this.workspaceId) {
      throw new Error('Workspace id is required');
    }
  }
}

class UpdateWorkspaceSettingsCommand {
  constructor({ workspaceId, settings }) {
    this.workspaceId = workspaceId;
    this.settings = settings;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.workspaceId) {
      throw new Error('Workspace id is required');
    }
    if (!this.settings) {
      throw new Error('Settings are required');
    }
  }
}

class DisconnectWorkspaceCommand {
  constructor({ workspaceId, organizationId }) {
    this.workspaceId = workspaceId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.workspaceId) {
      throw new Error('Workspace id is required');
    }
  }
}

module.exports = {
  InstallWorkspaceCommand,
  SyncWorkspaceCommand,
  UpdateWorkspaceSettingsCommand,
  DisconnectWorkspaceCommand,
};
