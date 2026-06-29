'use strict';

class SlackUser {
  constructor({ id, workspaceId, organizationId, slackUserId, slackTeamId, name, realName, displayName, email, avatarUrl, isBot, isAdmin, isOwner, isDeleted, timezone, title, phone, userGroups, teams, role, lastSyncedAt, createdAt, updatedAt }) {
    this.id = id;
    this.workspaceId = workspaceId;
    this.organizationId = organizationId;
    this.slackUserId = slackUserId;
    this.slackTeamId = slackTeamId;
    this.name = name;
    this.realName = realName;
    this.displayName = displayName;
    this.email = email;
    this.avatarUrl = avatarUrl;
    this.isBot = isBot || false;
    this.isAdmin = isAdmin || false;
    this.isOwner = isOwner || false;
    this.isDeleted = isDeleted || false;
    this.timezone = timezone;
    this.title = title;
    this.phone = phone;
    this.userGroups = userGroups || [];
    this.teams = teams || [];
    this.role = role;
    this.lastSyncedAt = lastSyncedAt;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.workspaceId) throw new Error('Workspace id is required');
    if (!this.slackUserId) throw new Error('Slack user id is required');
    if (!this.name) throw new Error('User name is required');
  }
}

module.exports = SlackUser;
