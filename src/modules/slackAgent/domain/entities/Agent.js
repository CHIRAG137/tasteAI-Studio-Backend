'use strict';

class Agent {
  constructor({
    id,
    organizationId,
    name,
    description,
    avatarUrl,
    isActive,
    isEnabled,
    assignedChannelIds,
    skills,
    aiInstructions,
    configuration,
    settings,
    llmConfig,
    promptConfig,
    permissions,
    mcpServerIds,
    webhookIds,
    slackAiCapabilities,
    connectorConfig,
    invocationConfig,
    createdById,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.description = description;
    this.avatarUrl = avatarUrl;
    this.isActive = isActive !== undefined ? isActive : true;
    this.isEnabled = isEnabled !== undefined ? isEnabled : true;
    this.assignedChannelIds = assignedChannelIds || [];
    this.skills = skills || [];
    this.aiInstructions = aiInstructions || [];
    this.configuration = configuration || {};
    this.settings = settings || {};
    this.llmConfig = llmConfig || {};
    this.promptConfig = promptConfig || {};
    this.permissions = permissions || {};
    this.mcpServerIds = mcpServerIds || [];
    this.webhookIds = webhookIds || [];
    this.slackAiCapabilities = slackAiCapabilities || { enabled: false };
    this.connectorConfig = connectorConfig || {};
    this.invocationConfig = invocationConfig || {
      appMention: { enabled: true, responseInThread: true },
      directMessage: { enabled: true, autoRespond: true },
      slashCommands: [],
      channelMonitoring: { enabled: true, respondInThread: false },
      keywordTriggers: [],
      webhookEvents: { messageReceived: true },
      routing: { mode: 'all' },
    };
    this.createdById = createdById;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
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

module.exports = Agent;
