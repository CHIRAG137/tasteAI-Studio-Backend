'use strict';

class SlackWorkspace {
  constructor({ id, organizationId, teamId, teamName, teamDomain, accessToken, botUserId, botAccessToken, scopes, authedUserId, installedById, installedAt, isActive, settings, metadata, createdAt, updatedAt }) {
    this.id = id;
    this.organizationId = organizationId;
    this.teamId = teamId;
    this.teamName = teamName;
    this.teamDomain = teamDomain;
    this.accessToken = accessToken;
    this.botUserId = botUserId;
    this.botAccessToken = botAccessToken;
    this.scopes = scopes || [];
    this.authedUserId = authedUserId;
    this.installedById = installedById;
    this.installedAt = installedAt || new Date();
    this.isActive = isActive !== undefined ? isActive : true;
    this.settings = settings || {};
    this.metadata = metadata || {};
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.teamId) throw new Error('Slack team id is required');
    if (!this.teamName) throw new Error('Slack team name is required');
    if (!this.accessToken) throw new Error('Access token is required');
    if (!this.installedById) throw new Error('Installed by user id is required');
  }
}

module.exports = SlackWorkspace;
