'use strict';

class CreateAgentCommand {
  constructor({
    organizationId,
    name,
    description,
    avatarUrl,
    aiInstructions,
    configuration,
    settings,
    llmConfig,
    promptConfig,
    createdById,
  }) {
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.avatarUrl = avatarUrl;
    this.aiInstructions = aiInstructions;
    this.configuration = configuration;
    this.settings = settings;
    this.llmConfig = llmConfig;
    this.promptConfig = promptConfig;
    this.createdById = createdById;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.organizationId) {
      throw new Error('Organization id is required');
    }
    if (!this.name || !this.name.trim()) {
      throw new Error('Agent name is required');
    }
  }
}

class UpdateAgentCommand {
  constructor({
    agentId,
    name,
    description,
    avatarUrl,
    aiInstructions,
    configuration,
    settings,
    llmConfig,
    promptConfig,
  }) {
    this.agentId = agentId;
    this.name = name;
    this.description = description;
    this.avatarUrl = avatarUrl;
    this.aiInstructions = aiInstructions;
    this.configuration = configuration;
    this.settings = settings;
    this.llmConfig = llmConfig;
    this.promptConfig = promptConfig;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.agentId) {
      throw new Error('Agent id is required');
    }
  }
}

class CloneAgentCommand {
  constructor({ agentId, name, organizationId }) {
    this.agentId = agentId;
    this.name = name;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.agentId) {
      throw new Error('Agent id is required');
    }
    if (!this.name || !this.name.trim()) {
      throw new Error('Cloned agent name is required');
    }
  }
}

class ToggleAgentCommand {
  constructor({ agentId, isEnabled, organizationId }) {
    this.agentId = agentId;
    this.isEnabled = isEnabled;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.agentId) {
      throw new Error('Agent id is required');
    }
    if (this.isEnabled === undefined) {
      throw new Error('isEnabled flag is required');
    }
  }
}

class AssignAgentChannelsCommand {
  constructor({ agentId, channelIds, organizationId }) {
    this.agentId = agentId;
    this.channelIds = channelIds;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.agentId) {
      throw new Error('Agent id is required');
    }
    if (!this.channelIds || !this.channelIds.length) {
      throw new Error('At least one channel id is required');
    }
  }
}

class UpdateAgentSkillsCommand {
  constructor({ agentId, skills, organizationId }) {
    this.agentId = agentId;
    this.skills = skills;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.agentId) {
      throw new Error('Agent id is required');
    }
    if (!this.skills) {
      throw new Error('Skills are required');
    }
  }
}

class UpdateAgentPermissionsCommand {
  constructor({ agentId, permissions, organizationId }) {
    this.agentId = agentId;
    this.permissions = permissions;
    this.organizationId = organizationId;
    this.validate();
    Object.freeze(this);
  }
  validate() {
    if (!this.agentId) {
      throw new Error('Agent id is required');
    }
    if (!this.permissions) {
      throw new Error('Permissions are required');
    }
  }
}

module.exports = {
  CreateAgentCommand,
  UpdateAgentCommand,
  CloneAgentCommand,
  ToggleAgentCommand,
  AssignAgentChannelsCommand,
  UpdateAgentSkillsCommand,
  UpdateAgentPermissionsCommand,
};
