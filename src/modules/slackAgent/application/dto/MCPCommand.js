'use strict';

class RegisterMCPServerCommand {
  constructor({ organizationId, name, serverUrl, serverType, apiKey, authentication, configuration, createdById }) {
    this.organizationId = organizationId;
    this.name = name;
    this.serverUrl = serverUrl;
    this.serverType = serverType;
    this.apiKey = apiKey;
    this.authentication = authentication;
    this.configuration = configuration;
    this.createdById = createdById;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) throw new Error('Organization id is required');
    if (!this.name || !this.name.trim()) throw new Error('Server name is required');
    if (!this.serverUrl) throw new Error('Server URL is required');
  }
}

class ExecuteMCPToolCommand {
  constructor({ connectionId, toolName, arguments, organizationId }) {
    this.connectionId = connectionId;
    this.toolName = toolName;
    this.arguments = arguments;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.connectionId) throw new Error('Connection id is required');
    if (!this.toolName) throw new Error('Tool name is required');
  }
}

class CheckMCPHealthCommand {
  constructor({ connectionId, organizationId }) {
    this.connectionId = connectionId;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.connectionId) throw new Error('Connection id is required');
  }
}

module.exports = { RegisterMCPServerCommand, ExecuteMCPToolCommand, CheckMCPHealthCommand };
