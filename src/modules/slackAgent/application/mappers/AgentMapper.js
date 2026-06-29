'use strict';

class AgentMapper {
  static toResponse(agent) {
    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      avatarUrl: agent.avatarUrl,
      isActive: agent.isActive,
      isEnabled: agent.isEnabled,
      assignedChannels: agent.assignedChannelIds,
      skills: agent.skills,
      aiInstructions: agent.aiInstructions,
      configuration: agent.configuration,
      settings: agent.settings,
      llmConfig: agent.llmConfig,
      promptConfig: agent.promptConfig,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  static toListResponse(agents) {
    return agents.map(a => AgentMapper.toResponse(a));
  }
}

module.exports = AgentMapper;
