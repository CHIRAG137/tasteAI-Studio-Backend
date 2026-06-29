'use strict';

class MCPConnection {
  constructor({ id, organizationId, name, serverUrl, serverType, apiKey, authentication, tools, isConnected, isEnabled, healthStatus, lastHealthCheckAt, configuration, metadata, createdById, createdAt, updatedAt }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.serverUrl = serverUrl;
    this.serverType = serverType;
    this.apiKey = apiKey;
    this.authentication = authentication || {};
    this.tools = tools || [];
    this.isConnected = isConnected || false;
    this.isEnabled = isEnabled !== undefined ? isEnabled : true;
    this.healthStatus = healthStatus || 'unknown';
    this.lastHealthCheckAt = lastHealthCheckAt;
    this.configuration = configuration || {};
    this.metadata = metadata || {};
    this.createdById = createdById;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    Object.freeze(this);
  }

  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('MCP connection name is required');
    if (!this.serverUrl) throw new Error('Server URL is required');
  }
}

module.exports = MCPConnection;
